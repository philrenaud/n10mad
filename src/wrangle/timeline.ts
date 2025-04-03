/**
 * Organizes the raw files.json into an array of years, each with an array of weeks, each with aggregate commit information.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import files from '../../data/files.json';

if (!files) {
  throw new Error('files.json does not exist; you need to run `bun fetch files` first');
}

type Commit = {
  author: string;
  date: string;
  message: string;
  url: string;
}

type Week = {
  weekNumber: number;
  date: string;
  commits: Commit[];
}

type Year = {
  year: string;
  weeks: Week[];
}


type Milestone = {
  date: string;
  title: string;
  description: string;
  url?: string;
}

const milestones: Milestone[] = [
  {
    date: '2015-06-01',
    title: 'First Commit',
    description: 'Nomad\'s first commit!',
    url: 'https://github.com/hashicorp/nomad/commit/1234567890',
  },
  {
    date: '2017-03-01',
    title: 'Nomad 0.1',
    description: 'Thx Armon!',
    url: 'https://github.com/hashicorp/nomad/commit/1234567890',
  },
  {
    date: '2020-12-08',
    title: 'Nomad 1.0',
    description: 'woohooooo',
    url: 'https://github.com/hashicorp/nomad/commit/1234567890',
  },
  {
    date: '2021-05-18',
    title: 'Nomad 1.1',
    description: 'Memory Oversubscription, Remote task drivers, and reserved CPU cores',
    url: 'https://www.hashicorp.com/en/blog/announcing-general-availability-of-hashicorp-nomad-1-1',
  },
  {
    date: '2021-11-16',
    title: 'Nomad 1.2',
    description: 'Sysbatch jobs, new job statuses, and Nomad Pack',
    url: 'https://www.hashicorp.com/en/blog/announcing-hashicorp-nomad-1-2',
  },
  {
    date: '2022-05-22',
    title: 'Nomad 1.3',
    description: 'Native Service Discovery and Edge Workloads',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-3-adds-native-service-discovery-and-edge-workload-support',
  },
  {
    date: '2022-10-06',
    title: 'Nomad 1.4',
    description: 'Secure Variables, Service Discovery Health Checks, and Keyboard Shortcuts',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-4-adds-nomad-variables-and-updates-service-discovery',
  },
  {
    date: '2023-03-02',
    title: 'Nomad 1.5',
    description: 'Dynamic Node Metadata and SSO support',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-5-adds-single-sign-on-and-dynamic-node-metadata',
  },
  {
    date: '2023-07-19',
    title: 'Nomad 1.6',
    description: 'Node Pools, Job Status UI overhaul, and Nomad Pack 1.0',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-6-adds-node-pools-ux-updates-and-more',
  },
  {
    date: '2023-12-07',
    title: 'Nomad 1.7',
    description: 'Workload Identity, improved Vault integrations, and Actions',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-7-improves-vault-and-consul-integrations-adds-numa-support',
  },
  {
    date: '2024-05-29',
    title: 'Nomad 1.8',
    description: 'Exec2 task driver, Consul integration improvements, and a new Jobs UI',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-8-adds-exec2-task-driver-support-consul-api-gateway-transparent-proxy',
  },
  {
    date: '2024-10-15',
    title: 'Nomad 1.9',
    description: 'NVIDIA GPU support, NUMA, and Golden Job Versions',
    url: 'https://www.hashicorp.com/en/blog/nomad-1-9-adds-nvidia-mig-support-golden-job-versions-and-more',
  },
  {
    date: '2025-04-08',
    title: 'Nomad 1.10',
    description: 'Dynamic Host Volumes, Upgrade testing overhaul and OIDC improvements',
  },
  {
    date: '2015-12-05',
    title: '1000th star',
    description: 'Thanks, @GregRogers',
  },
  // {
  //   date: '2019-10-12',
  //   title: '5000th star',
  //   description: 'Thanks, @rastreosigloxxi',
  // },
  {
    date: '2022-01-09',
    title: '10000th star',
    description: 'Thanks, @Robitx',
  },
  // {
  //   date: '2024-12-23',
  //   title: '15000th star',
  //   description: 'Thanks, @sakaat',
  // },
  {
    date: '2015-09-25',
    title: '1000th commit',
    description: 'api: add client server methods',
    url: "https://github.com/hashicorp/nomad/commit/e6a3b4ec4f661aaf82195d4f2acd2df84bae6a9a"
  },
  // {
  //   date: '2016-08-09',
  //   title: '5000th commit',
  //   description: "Update debug option from string to bool",
  //   url: "https://github.com/hashicorp/nomad/commit/fec9204dccebbb6bf62a66de3be05ecfbac2f335"
  // },
  {
    date: '2018-01-05',
    title: '10000th commit',
    description: "Adds the ember-test-selectors addon",
    url: "https://github.com/hashicorp/nomad/commit/96752ec100c4ff5dc72cd3912fd8678d969e706b"
  },
  // {
  //   date: '2019-05-17',
  //   title: '15000th commit',
  //   description: 'lookup executables inside chroot',
  //   url: "https://github.com/hashicorp/nomad/commit/568a120e7bac9d3717c2317f1439e4ec71f7a89b"
  // },
  // {
  //   date: '2020-11-11',
  //   title: '20000th commit',
  //   description: 'csi: Postrun hook should not change mode',
  //   url: "https://github.com/hashicorp/nomad/commit/0ed0b945c9f58013963be0b7b79aba2a73dcb960"
  // },
  // {
  //   date: '2023-08-23',
  //   title: '25000th commit',
  //   description: "docs: fix a sentence in vault-integration.mdx (#18296)",
  //   url: "https://github.com/hashicorp/nomad/commit/f122d291d2b2d740bf316d0b71877be4cab76b92"
  // },



].map((milestone) => {
  return {
    ...milestone,
    date: new Date(milestone.date)
  }
});

const allCommits = files[0].commits;

const commitsByYear = allCommits.reduce((acc, commit) => {
  // Simple version of this: year is "2025-03-28T15:13:13Z" formatted, so
  // I can just take the first 4 characters.
  const year = commit.date.slice(0, 4);
  // There's an argument for like, counting asterisks in the commit message as an indication of flattened/squashed commits. I don't think early Nomad commits did this (lots of fast back-to-back commits on the same file, etc) and it makes things appear a little lop-sided.
  acc[year] = (acc[year] || 0) + 1;
  return acc;
}, {});
const getWeeklyCommitsByYear = () => {
  console.time('getWeeklyCommitsByYear');
  // let years = allCommits.map(commit => commit.date.slice(0, 4))
  // .sort()
  // // de-dupe
  // .filter((year, index, self) => self.indexOf(year) === index);

  // ugh let's not make it weird
  const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

  const weeklyCommitsByYear = years.map((year) => {
    let commitsInYear = allCommits.filter((commit) => commit.date.slice(0, 4) === year);
    const weeksInYear = Array.from({ length: 52 }).map((_, i) => {
      return i
    });

    let binnedCommits = commitsInYear.map((commit) => {
      const date = new Date(commit.date);
      const startOfYear = new Date(`${year}-01-01`);
      const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      // Calculate which week this falls into (0-51)
      const weekNumber = Math.min(Math.floor(dayOfYear / 7), 51); // Cap at 51 (week 52)
      return {
        weekNumber,
        date,
        commit
      }
    });

    console.log('binnedCommits', binnedCommits);
    // Count by weekNumber
    const weekCounts = weeksInYear.map((week) => {  
      const commitsForWeek = binnedCommits.filter((commit) => commit.weekNumber === week);
      const uniqueAuthors = new Set(commitsForWeek.map((commit) => commit.commit.author));
      return {
        weekNumber: week,
        count: commitsForWeek.length,
        weekStart: new Date(`${year}-01-01`).getTime() + (week * 7 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(`${year}-01-01`).getTime() + ((week + 1) * 7 * 24 * 60 * 60 * 1000),
        authors: Array.from(uniqueAuthors),
        // weekStart: commitsForWeek[0].date,
        // weekEnd: commitsForWeek[commitsForWeek.length - 1].date
      }
    });
    console.log('weekCounts', weekCounts);
    // add milestones in
    weekCounts.forEach((week) => {
      const milestone = milestones.find((milestone) => {
        return milestone.date >= week.weekStart && milestone.date <= week.weekEnd;
      })
      if (milestone) {
        week.milestone = milestone;
      }
    })
    return weekCounts;
  });

  return weeklyCommitsByYear;
}



export async function wrangleTimeline() {
  const timeline = await getWeeklyCommitsByYear();
  return timeline;
}
