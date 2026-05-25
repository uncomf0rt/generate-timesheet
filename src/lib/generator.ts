import {
  eachDayOfInterval,
  endOfDay,
  format,
  isWeekend as isDateWeekend,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { getAdoCommits, getAdoRepos, getHolidays, getJiraTasks } from './api';
import { Config, DayRecord } from './types';

export async function generateTimesheetData(
  config: Config
): Promise<{ records: DayRecord[]; jiraTokenExpired: boolean }> {
  const startDate = startOfDay(parseISO(config.startDate));
  const endDate = endOfDay(parseISO(config.endDate));

  const fromIso = startDate.toISOString();
  // Include the whole end date
  const toIso = endDate.toISOString();

  // 1. Gather Dates & Holidays
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const uniqueMonths = new Set<string>();
  for (const day of days) {
    uniqueMonths.add(`${day.getFullYear()}-${day.getMonth()}`);
  }

  let holidaysData: any[] = [];
  try {
    const holidaysResponses = await Promise.all(
      Array.from(uniqueMonths).map(async (ym) => {
        const [yearStr, monthStr] = ym.split('-');
        return await getHolidays(parseInt(yearStr, 10), parseInt(monthStr, 10));
      })
    );
    holidaysData = holidaysResponses.flat();
  } catch (error) {
    console.error('Failed to fetch holidays', error);
  }

  // 2. Gather Azure DevOps Data
  const allCommits: any[] = [];
  const projects = config.adoProject
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (config.adoOrg && projects.length > 0 && config.azurePat && config.adoEmail) {
    try {
      for (const project of projects) {
        const projectConfig = { ...config, adoProject: project };
        const repos = await getAdoRepos(projectConfig);
        await Promise.all(
          repos.map(async (repo: any) => {
            try {
              const commits = await getAdoCommits({
                ...projectConfig,
                repoId: repo.id,
                startDate: fromIso,
                endDate: toIso,
              });
              if (commits && commits.length > 0) {
                allCommits.push(
                  ...commits.map((c: any) => ({
                    ...c,
                    repoName: repo.name,
                    projectName: project,
                  }))
                );
              }
            } catch (_e) {
              console.warn(`Failed to fetch commits for repo ${repo.name} in project ${project}`);
            }
          })
        );
      }
    } catch (_e) {
      console.error('Failed to fetch ADO Repos');
    }
  }

  // 3. Gather Jira Data
  let allTasks: any = [];
  let jiraTokenExpired = false;
  if (config.jiraToken) {
    try {
      const fromDateStr = format(startDate, 'yyyy-MM-dd');
      const toDateStr = format(endDate, 'yyyy-MM-dd');
      allTasks = await getJiraTasks({ ...config, startDate: fromDateStr, endDate: toDateStr });
    } catch (e: any) {
      if (e.message === 'JIRA_TOKEN_EXPIRED') {
        jiraTokenExpired = true;
      } else {
        console.error('Failed to fetch Jira Tasks: ', e);
      }
    }
  }

  // 4. Core Processing Loop
  const records: DayRecord[] = days.map((day) => {
    const isWeekend = isDateWeekend(day);

    // Check if it's a holiday
    const dayStr = format(day, 'yyyy-MM-dd');
    const holidayInfo = holidaysData.find((h: any) => h.date === dayStr);
    const isHoliday = !!holidayInfo;

    const isDayOff = isWeekend || isHoliday;

    // Filter commits for this day
    // With OAuth, we get all commits from the authenticated user
    const dayCommits = allCommits
      .filter((c) => isSameDay(new Date(c.author.date), day))
      .map((c) => `[${c.repoName}] ${c.comment}`);

    // Filter tasks for this day (Mock behavior: assigning tasks updated on this day)
    // Jira fields depend on the config, but we can look at updated date
    const dayTasks = allTasks
      .filter((t: any) => t.fields?.updated && isSameDay(new Date(t.fields.updated), day))
      .map((t: any) => `[${t.key}] ${t.fields?.summary || ''}`);

    return {
      date: day,
      isWeekend,
      isHoliday,
      holidayName: holidayInfo?.description,
      status: isDayOff ? 'Libur' : 'Hari kerja',
      commits: dayCommits,
      tasks: dayTasks,
      editableActivity: [...dayTasks, ...dayCommits].join('\n'),
      jamMulai: isDayOff ? '' : '08:00',
      jamBerakhir: isDayOff ? '' : '17:00',
    };
  });

  return {
    records,
    jiraTokenExpired,
  };
}
