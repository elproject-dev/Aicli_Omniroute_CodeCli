const { spinner } = require("@clack/prompts"); 
const s = spinner(); 
s.start("Generating...");

const phrases = [
  "Message 1",
  "Message 2", 
  "Message 3",
  "Message 4",
  "Message 5",
  "Message 6",
  "Message 7",
  "Message 8",
  "Message 9",
  "Message 10"
];

let i = 0;
const t = setInterval(() => {
  s.message(phrases[i]);
  i = (i+1) % phrases.length;
}, 1000);

setTimeout(() => {
  clearInterval(t);
  s.stop("Done showing all 10 messages");
}, 10000);