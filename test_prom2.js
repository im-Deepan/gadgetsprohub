process.on('unhandledRejection', (err) => {
  console.log("UNHANDLED REJECTION DETECTED:", err);
});

function getPromise() {
  const p = Promise.reject(new Error("boom"));
  const returnedPromise = p.then(res => res);
  returnedPromise.catch(() => {}); // Attach handler
  return returnedPromise; // Caller gets this
}

function run() {
  getPromise(); // Caller does not catch or await
}
run();

setTimeout(() => console.log("Done"), 100);
