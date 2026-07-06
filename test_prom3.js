process.on('unhandledRejection', (err) => {
  console.log("UNHANDLED REJECTION DETECTED:", err);
});

const p = Promise.reject(new Error("boom"));
p.catch(() => {});

const p2 = p.then(res => res);
const returnedPromise = p2.finally(() => {});
returnedPromise.catch(() => {});

setTimeout(() => console.log("Done"), 100);
