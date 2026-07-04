const p = Promise.reject(new Error("test"));
p.catch(() => {});
p.then(() => console.log("Success")); // this will get rejected, and THIS listener doesn't have a catch!
