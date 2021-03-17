/* eslint-disable no-magic-numbers */

const EventEmitter = require('events');
const uuid = require('uuid/v4');

/**
 * @class Reporter
 * @private
 */
class Reporter extends EventEmitter {

    addListener(...args) {
        super.addListener(...args);
    }
    on(...args) {
        super.on(...args);
    }

    fireEvent(msg, data) {
        this.emit(msg, data);
    }
}


/**
 * @class Job
 * @description Wrapper for task which returns a Promise
 */
class Job {

    /**
     *
     * @param {Promise} payload
     * @param {Object} [params]
     * @param {String} [name] - job name
     */
    constructor(payload, params = {}, name) {
        this.payload = payload;
        this._name = name;
        this._result = null;
        this.params = params;
        this.reporter = new Reporter();
        this.id = uuid();
        this.isRunning = this.isDone = false;
        this.isWaiting = true;
        this.initNow = Date.now();
    }

    toJSON() {
        return {
            id: this.id
            , name: this.name || 'Not Specified'
            , status: this.status()
            , result: this.result
        };
    }

    get status() {
        if(this.isDone) {
            return 'done';
        }
        if(this.isRunning) {
            return 'running';
        }
        if(this.isWaiting) {
            return 'waiting';
        }
        return 'unknown';
    }

    get name() {
        return this._name;
    }

    /**
     * @param {String} s
     *
     * @memberof Job
     */
    set name(s) {
        this._name = s;
    }

    /**
     *
     * @returns {Promise<any>}
     */
    exec() {
        this.reporter.fireEvent('started', this.id);
        this.execNow = Date.now();
        this.isWaiting = false;
        this.isRunning = true;
        try {
            return this.payload(this.params)
                .catch(err => {
                    return { error: err };
                })
                .then((result) => {
                    this.isRunning = false;
                    this.isDone = true;
                    this.result = result;
                    this.execSeconds = (Date.now() - this.execNow) / 1000;
                    this.queueSeconds = (Date.now() - this.initNow) / 1000;
                    this.reporter.fireEvent('done', this);
                    return Promise.resolve(this.result);
                });
        }
        catch (err) {
            this.isRunning = false;
            this.isDone = true;
            this.error = err.message;
            this.result = { error: err };
            this.execSeconds = (Date.now() - this.execNow) / 1000;
            this.queueSeconds = (Date.now() - this.initNow) / 1000;
            this.reporter.fireEvent('done', this);
            return Promise.resolve(this.result);
        }

    }

    get result() {
        return this._result;
    }

    set result(value) {
        this._result = value;
    }

}


/**
 * @class JobQueue
 * @description Executes Jobs in parallel while limiting concurrency
 */
class JobQueue {

    /**
     *
     * @param {Array<Job>} jobs
     * @param {Number} concurrentJobs
     */
    constructor(jobs = [], concurrentJobs = 1) {
        jobs.forEach((j, i) => {
            const good = j instanceof Job;
            if(!good) {
                throw new TypeError(`job at index ${i} must be instance of Job`);
            }
        });
        this.concurrent = concurrentJobs;
        this.total = jobs.length;
        this.toDo = jobs;
        this.running = {};
        this.complete = [];
        this.reporter = new Reporter();
        this.now = Date.now();
    }

    get runAnother() {
        return Boolean((Object.keys(this.running).length < this.concurrent) && this.toDo.length);
    }

    get done() {
        return Boolean((Object.keys(this.running).length === 0) && (this.toDo.length === 0));
    }

    /**
     *
     * @param {String} msg
     * @param {*} data
     * @emits Reporter: any
     */
    report(msg, data) {
        const seconds = (Date.now() - this.now) / 1000;
        if(msg !== 'done') {

            const running = Object.keys(this.running).length;
            const toDo = this.toDo.length;
            const complete = this.complete.length;

            this.reporter.fireEvent(msg, { ...data, running, toDo, complete, seconds });
        }
        else {
            this.reporter.fireEvent(msg, { ...data, seconds });
        }
    }


    /**
     * executes jobs until toDo is empty
     *
     * @emits Reporter:jobStarted
     * @emits Reporter:jobFinished
     * @emits Reporter:done
     * @returns {Promise<JobQueue>}
     */
    run() {
        while(this.runAnother) {
            const job = this.toDo.shift();
            this.running[job.id] = job;
            this.report('jobStarted', job);
            job.exec();
            job.reporter.on('done', (job) => {
                this.report('jobFinished', job);
                this.complete.push(job);
                delete this.running[job.id];
                this.run();
            });
        }
        if(this.done) {
            this.report('done', { complete: this.complete, toDo: this.toDo, running: this.running });
        }

    }
}


exports.Job = Job;
exports.JobQueue = JobQueue;
