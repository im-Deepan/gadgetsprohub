process.on('unhandledRejection', (err) => {
  console.log("UNHANDLED:", err);
});
const p = Promise.reject(new Error("fail"));
p.catch(() => {});

const existingPromise = p.finally(() => {});
existingPromise.catch(() => {});
setTimeout(() => console.log("Done"), 100);
