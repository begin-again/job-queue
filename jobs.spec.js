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
            expect(job.isDone).to.be.false;

            const result = await job.exec();

            expect(result).to.equal('hey');
            expect(job.isDone).to.be.true;
            expect(payloadFake).calledOnceWith(params);
        });
        it('should trap non-promise payloads on exec', async () => {
            const payloadFake = sinon.fake.returns('hey');
            const params = { hey: 1, you: 2 };
            const job = new Job(payloadFake, params);
            expect(job.isDone).to.be.false;
            expect(job.error).to.be.undefined;

            const result = await job.exec();

            expect(result).keys('error');
            expect(job.error).not.to.be.empty;
            expect(job.isDone).to.be.true;
            expect(payloadFake).calledOnceWith(params);
        });
        it('should have status text', async () => {
            const payloadFake = sinon.fake.resolves('hey');
            const params = { hey: 1, you: 2 };
            const job = new Job(payloadFake, params);
            expect(job.isDone).to.be.false;
            expect(job.status).equals('waiting');

            const result = await job.exec();

            expect(result).to.equal('hey');
            expect(job.status).to.equal('done');
            expect(job.error).to.be.undefined;
            expect(job.isDone).to.be.true;
            expect(payloadFake).calledOnceWith(params);
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
            it('should execute the job and emit status', async function(done) {
                this.timeout(3000);
                const payloadFake = sinon.fake.resolves('hey');
                const jobs = [];
                const maxConcurrentJobs = 1;
                this.jobFinishedCount = 0;
                this.jobStartedCount = 0;
                this.doneCount = 0;
                jobs.push(new Job(payloadFake));
                jobs.push(new Job(payloadFake));
                const tester = (error, { toDo, running, complete }) => {
                    console.log('wtf');
                    expect(error).to.be.undefined;
                    expect(toDo).to.equal(0);
                    expect(running).to.equal(0);
                    expect(complete).to.equal(2, 'complete should be same as number of jobs');

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

                q.run(tester);

            });
        });
    });
});
