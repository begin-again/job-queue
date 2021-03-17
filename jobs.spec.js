/* eslint-disable no-magic-numbers */
const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
chai.use(require('sinon-chai'));

const { Job, JobQueue } = require('./jobs.js');

describe('Jobs Module', () => {
    describe('Job', () => {
        it('should invoke the payload on exec', async () => {
            const payloadFake = sinon.fake.resolves('hey');
            const params = { hey: 1, you: 2 };
            const job = new Job(payloadFake, params);
            job.reporter.on('done', ({ isDone, result }) => {
                expect(isDone).to.be.true;
                expect(payloadFake).calledOnceWith(params);
                expect(result).to.equal('hey');
            });
            expect(job.isDone).to.be.false;

            await job.exec();
        });
        it('should trap non-promise payloads on exec', async () => {
            const payloadFake = sinon.fake.returns('hey');
            const params = { hey: 1, you: 2 };
            const job = new Job(payloadFake, params);
            job.reporter.on('done', ({ isDone, result }) => {
                expect(isDone).to.be.true;
                expect(payloadFake).calledOnceWith(params);
                expect(result).keys('error');
            });

            expect(job.isDone).to.be.false;
            expect(job.error).to.be.undefined;

            await job.exec();

        });
        it('should have status text', async () => {
            const payloadFake = sinon.fake.resolves('hey');
            const params = { hey: 1, you: 2 };
            const job = new Job(payloadFake, params);
            job.reporter.on('done', ({ isDone, result, error }) => {
                expect(isDone).to.be.true;
                expect(payloadFake).calledOnceWith(params);
                expect(result).to.equal('hey');
                expect(error).to.be.undefined;
                expect(job.status).to.equal('done');
            });
            expect(job.isDone).to.be.false;
            expect(job.status).equals('waiting');

            await job.exec();

        });
        it('should have some properties', () => {
            const payloadFake = sinon.fake.resolves('hey');
            const job = new Job(payloadFake);
            expect(job.name).to.be.undefined;

            job.name = 'name';

            expect(job.id).not.to.be.empty;
            expect(job.name).equals('name');
        });
    });
    describe('JobQueue', () => {
        describe('constructor', () => {
            it('should throw if a job is not instance of Job', () => {
                const wrap = () => {
                    new JobQueue([ 1 ]);
                };
                expect(wrap).to.throw(TypeError);
            });
        });
        describe('runAnother', () => {
            it('should be true ', () => {
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                jobs.push(new Job(payloadFake));

                const q = new JobQueue(jobs, maxConcurrentJobs);

                expect(q.runAnother).to.be.true;
            });
            it('should be false', () => {
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                jobs.push(new Job(payloadFake));

                const q = new JobQueue(jobs, maxConcurrentJobs);
                expect(q.runAnother).to.be.true;

                q.running.fake = q.toDo.shift();

                expect(q.runAnother).to.be.false;
            });
            it('should be false', () => {
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                jobs.push(new Job(payloadFake));
                jobs.push(new Job(payloadFake));

                const q = new JobQueue(jobs, maxConcurrentJobs);
                expect(q.runAnother).to.be.true;

                q.running.fake = q.toDo.shift();

                expect(q.runAnother).to.be.false;
            });
        });
        describe('done', () => {
            it('should be true', () => {
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                jobs.push(new Job(payloadFake));

                const q = new JobQueue(jobs, maxConcurrentJobs);
                expect(q.done).to.be.false;

                q.complete.push(q.toDo.shift());

                expect(q.done).to.be.true;
            });
            it('should be false', () => {
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                jobs.push(new Job(payloadFake));
                jobs.push(new Job(payloadFake));

                const q = new JobQueue(jobs, maxConcurrentJobs);
                expect(q.done).to.be.false;

                q.complete.push(q.toDo.shift());

                expect(q.done).to.be.false;
            });
            it('should be false', () => {
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                jobs.push(new Job(payloadFake));

                const q = new JobQueue(jobs, maxConcurrentJobs);
                expect(q.done).to.be.false;

                q.running.fake = 'who cares';

                q.complete.push(q.toDo.shift());

                expect(q.done).to.be.false;
            });
        });
        describe('run', () => {
            it('should execute the job and emit status', function(done) {
                const payloadFake1 = sinon.fake.resolves('hey');
                const payloadFake2 = sinon.fake.resolves('there');
                const jobs = [];
                const maxConcurrentJobs = 1;
                this.jobFinishedCount = 0;
                this.jobStartedCount = 0;
                this.doneCount = 0;
                jobs.push(new Job(payloadFake1, {}, 'one'));
                jobs.push(new Job(payloadFake2, {}, 'two'));
                const tester = ({ toDo, running, complete }) => {
                    expect(toDo).to.be.empty;
                    expect(running).to.be.empty;
                    expect(complete.length).to.equal(2, 'complete should be same as number of jobs');

                    expect(this.jobFinishedCount).to.equal(2, 'jobFinishedCount should be 2');
                    expect(this.jobStartedCount).to.equal(2, 'jobStartedCount should be 2');
                    done();
                };

                const q = new JobQueue(jobs, maxConcurrentJobs);

                q.reporter.on('jobStarted', ({ running }) => {
                    this.jobStartedCount++;
                    expect(running).is.lessThan(maxConcurrentJobs + 1, 'should be less than max concurrent jobs');
                });

                q.reporter.on('jobFinished', () => {
                    this.jobFinishedCount++;
                });

                q.reporter.on('done', tester);

                q.run();

            });
        });
    });
});
