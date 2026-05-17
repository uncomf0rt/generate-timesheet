import { Config, DayRecord } from './types';
import { getAdoRepos, getAdoCommits, getJiraTasks, getHolidays } from './api';
import { eachDayOfInterval, isWeekend as isDateWeekend, format, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns';

export async function generateTimesheetData(config: Config): Promise<DayRecord[]> {
  const startDate = startOfDay(parseISO(config.startDate));
  const endDate = endOfDay(parseISO(config.endDate));
  
  const fromIso = startDate.toISOString();
  // Include the whole end date
  const toIso = endDate.toISOString();
  
  // 1. Gather Dates & Holidays
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const uniqueMonths = new Set<string>();
  days.forEach(day => {
    uniqueMonths.add(`${day.getFullYear()}-${day.getMonth()}`);
  });
  
  let holidaysData: any[] = [];
  try {
    const holidaysResponses = await Promise.all(
      Array.from(uniqueMonths).map(async ym => {
        const [yearStr, monthStr] = ym.split('-');
        return await getHolidays(parseInt(yearStr), parseInt(monthStr));
      })
    );
    holidaysData = holidaysResponses.flat();
  } catch (error) {
    console.error("Failed to fetch holidays", error);
  }
  
  // 2. Gather Azure DevOps Data
  let allCommits: any[] = [];
  if (config.adoOrg && config.adoProject && config.azurePat && config.adoEmail) {
    try {
      const repos = await getAdoRepos(config);
      await Promise.all(repos.map(async (repo: any) => {
        try {
          const commits = await getAdoCommits({ ...config, repoId: repo.id, startDate: fromIso, endDate: toIso });
          if (commits && commits.length > 0) {
            allCommits.push(...commits.map((c: any) => ({
              ...c,
              repoName: repo.name
            })));
          }
        } catch (e) {
          console.warn(`Failed to fetch commits for repo ${repo.name}`);
        }
      }));
    } catch (e) {
      console.error("Failed to fetch ADO Repos");
    }
  }

  // 3. Gather Jira Data
  let allTasks: any = [];
  console.log('config.jiraToken', config.jiraToken?.access_token);
  if (config.jiraToken) {
    try {
      const fromDateStr = format(startDate, 'yyyy-MM-dd');
      const toDateStr = format(endDate, 'yyyy-MM-dd');
      allTasks = await getJiraTasks({...config, startDate: fromDateStr, endDate: toDateStr});
    } catch (e) {
      console.error("Failed to fetch Jira Tasks: ", e);
    }
  }

  // 4. Core Processing Loop
  const records: DayRecord[] = days.map(day => {
    const isWeekend = isDateWeekend(day);
    
    // Check if it's a holiday
    const dayStr = format(day, 'yyyy-MM-dd');
    const holidayInfo = holidaysData.find((h: any) => h.date === dayStr);
    const isHoliday = !!holidayInfo;
    
    const isDayOff = isWeekend || isHoliday;
    
    // Filter commits for this day
    // With OAuth, we get all commits from the authenticated user
    const dayCommits = allCommits.filter(c => isSameDay(new Date(c.author.date), day))
      .map(c => `[${c.repoName}] ${c.comment}`);
      
    // Filter tasks for this day (Mock behavior: assigning tasks updated on this day)
    // Jira fields depend on the config, but we can look at updated date
    const dayTasks = allTasks.filter((t: any) => t.fields?.updated && isSameDay(new Date(t.fields.updated), day))
      .map((t: any) => `[${t.key}] ${t.fields?.summary || ''}`);

    return {
      date: day,
      isWeekend,
      isHoliday,
      holidayName: holidayInfo?.description,
      status: isDayOff ? "Libur" : "Hari kerja",
      commits: dayCommits,
      tasks: dayTasks,
      editableActivity: [...dayTasks, ...dayCommits].join('\n')
    };
  });

  return records;
}
