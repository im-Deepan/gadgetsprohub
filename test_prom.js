process.on('unhandledRejection', (err) => {
  console.log("UNHANDLED REJECTION DETECTED:", err);
});

function getPromise() {
  const p = Promise.reject(new Error("boom"));
  const returnedPromise = p.then(res => res);
  returnedPromise.catch(() => {}); // Attach handler
  return returnedPromise; // Caller gets this
}

async function run() {
  const p = getPromise();
  // Caller does NOT catch it, but awaits it
  try {
    await p;
  } catch (err) {
    console.log("Caller caught it:", err);
  }
}
run();

setTimeout(() => console.log("Done"), 100);
