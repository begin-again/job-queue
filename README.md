# Job Queue

I wanted to create a tool that I could use to run a lot of tasks without taxing a system too much as might happen with `Promise.all`.

- tests: `yarn test`
- watch it work, `yarn start` or `node play`
  - edit the number of concurrentJobs on line 33 `new JobQueue(jobs, 6)` and see how long it takes the Q to process the jobs.
