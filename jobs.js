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

    fireEvent(msg, id) {
        this.emit(msg, id);
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
    constructor(payload, params = [], name) {
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
                    this.reporter.fireEvent('done', this.id);
                    return Promise.resolve(this.result);
                });
        }
        catch (err) {
            this.isRunning = false;
            this.isDone = true;
            this.error = err.message;
            this.result = { error: this.error };
            this.execSeconds = (Date.now() - this.execNow) / 1000;
            this.queueSeconds = (Date.now() - this.initNow) / 1000;
            this.reporter.fireEvent('done', this.id);
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
     * @callback cb
     */
    constructor(jobs = [], concurrentJobs = 1, cb) {
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
        this.callBack = cb;
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
     * @param {Job} job
     * @emits Reporter: any
     */
    report(msg, job) {
        const running = Object.keys(this.running).length;
        const toDo = this.toDo.length;
        const complete = this.complete.length;
        const seconds = (Date.now() - this.now) / 1000;
        const details = { running, toDo, complete, seconds };

        if(job) {
            details.id = job.id;
        }
        console.log(msg);
        this.reporter.fireEvent(msg, details);
    }


    /**
     * executes jobs until toDo is empty
     *
     * @emits Reporter:jobStarted
     * @emits Reporter:jobFinished
     * @emits Reporter:done
     */
    run() {
        const _this = this;
        while(this.runAnother) {
            const job = _this.toDo.shift();
            _this.running[job.id] = job;
            _this.report('jobStarted', job);
            job
                .exec()
                .then(() => {
                    _this.report('jobFinished', job);
                    _this.complete.push(job);
                    delete _this.running[job.id];
                    _this.run();
                });
        }
        if(_this.done) {
            _this.report('done');
            return this.callBack(null, this.complete.map(j => j));
            // return Promise.resolve(_this);
        }
    }
}


exports.Job = Job;
exports.JobQueue = JobQueue;
