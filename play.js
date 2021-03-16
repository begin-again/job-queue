const {Job, JobQueue} = require('./jobs.js');

/**
 *
 * @param {Object} param0
 * @param {String} param0.msg - message
 * @param {Number} param0.seconds - delay in seconds
 */
const delay = ({msg, seconds}) => {
    return new Promise((resolve) => {
            setTimeout(() => {
            resolve({message: msg, seconds });
        }, seconds * 1000)
    })

}

const jobs = [
    new Job(delay, {msg: 'job 1', seconds: 3}),
    new Job(delay, {msg: 'job 2', seconds: 4}),
    new Job(delay, {msg: 'job 3', seconds: 2}),
];

const jq = new JobQueue(jobs, 2,(err, out) => {
    if(err){
        console.error(err)
    }
    else {
        console.log(`status: ${out}`)
    }
} );

jq.run()
