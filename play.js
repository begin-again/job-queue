/* eslint-disable no-magic-numbers */
const { Job, JobQueue } = require('./jobs.js');

/**
     *
     * @param {Object} param0
     * @param {String} param0.msg - message
     * @param {Number} param0.seconds - delay in seconds
     */
const delay = ({ msg, seconds }) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ message: msg, seconds });
        }, seconds * 1000);
    });

};

const jobs = [
    new Job(delay, { msg: 'job 1', seconds: 3 })
    , new Job(delay, { msg: 'job 2', seconds: 4 })
    , new Job(delay, { msg: 'job 3', seconds: 2 })
    , new Job(delay, { msg: 'job 21', seconds: 3 })
    , new Job(delay, { msg: 'job 22', seconds: 4 })
    , new Job(delay, { msg: 'job 23', seconds: 2 })
    , new Job(delay, { msg: 'job 31', seconds: 3 })
    , new Job(delay, { msg: 'job 32', seconds: 4 })
    , new Job(delay, { msg: 'job 33', seconds: 2 })
    , new Job(delay, { msg: 'job 41', seconds: 3 })
    , new Job(delay, { msg: 'job 42', seconds: 4 })
    , new Job(delay, { msg: 'job 43', seconds: 2 })
    , ];

const jq = new JobQueue(jobs, 6);

jq.reporter.on('done', (data) => {
    const { complete, seconds } = data;
    complete.forEach(job => {
        const { id, result, execSeconds, queueSeconds } = job;
        process.stdout.write(`
            ${id}
               result: ${JSON.stringify(result)}
               Exec Time(s) = ${Math.round(execSeconds)}, Q Time(s) = ${Math.round(queueSeconds)}
            \n`);
    });
    console.log(`Total Run Time(s): ${seconds}`);
});

jq.reporter.on('jobStarted', ({ id, name }) => {
    console.log('Job Start for: ', id, name || 'N/S');
});

jq.reporter.on('jobFinished', ({ id, name }) => {
    console.log('Job Done for: ', id, name || 'N/S');
});

jq.run();
