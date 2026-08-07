const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
  input: fs.createReadStream("/home/elproject/.gemini/antigravity-ide/brain/26a3d71c-49fa-4410-8486-8a0db4bc193a/.system_generated/logs/transcript_full.jsonl")
});

const steps = {};
const edits = [];

rl.on("line", (lineStr) => {
  const obj = JSON.parse(lineStr);
  
  if (obj.type === "VIEW_FILE") {
    steps[obj.step_index] = obj.content;
  }
  
  if (obj.tool_calls) {
    for (const tc of obj.tool_calls) {
      if ((tc.name === "replace_file_content" || tc.name === "multi_replace_file_content") && tc.args.TargetFile.includes("chat.ts")) {
        edits.push({
          step: obj.step_index,
          name: tc.name,
          args: tc.args
        });
      }
    }
  }
});

rl.on("close", () => {
  console.log("Transcript loaded.");
  
  // 1. Get original L1-800 from Step 4
  const step4Lines = {};
  steps[4].split("\n").forEach(l => {
    const m = l.match(/^(\d+): (.*)$/);
    if (m) step4Lines[parseInt(m[1], 10)] = m[2];
  });
  
  let originalCode = "";
  for (let i = 1; i <= 800; i++) {
    originalCode += (step4Lines[i] || "") + "\n";
  }
  
  // 2. Apply Step 79's edit to originalCode
  const step79 = edits.find(e => e.step === 79);
  if (!step79) {
    console.error("Step 79 edit not found!");
    process.exit(1);
  }
  
  // Replace L554-675 of originalCode
  const originalCodeLines = originalCode.split("\n");
  const before554 = originalCodeLines.slice(0, 553).join("\n") + "\n";
  const after675 = originalCodeLines.slice(675, 800).join("\n") + "\n";
  
  let modifiedCode = before554 + step79.args.ReplacementContent + "\n" + after675;
  
  // 3. Get lines from Step 99 (L1086-1100), Step 101 (L1101-1300), Step 103 (L1301-1500)
  const step99Lines = {};
  steps[99].split("\n").forEach(l => {
    const m = l.match(/^(\d+): (.*)$/);
    if (m) step99Lines[parseInt(m[1], 10)] = m[2];
  });
  
  const step101Lines = {};
  steps[101].split("\n").forEach(l => {
    const match = l.match(/^(\d+): (.*)$/);
    if (match) step101Lines[parseInt(match[1], 10)] = match[2];
  });
  
  const step103Lines = {};
  steps[103].split("\n").forEach(l => {
    const match = l.match(/^(\d+): (.*)$/);
    if (match) step103Lines[parseInt(match[1], 10)] = match[2];
  });
  
  // Build modifiedCode up to 1500
  const modifiedCodeLines = modifiedCode.split("\n");
  console.log("Modified code lines count before appends:", modifiedCodeLines.length);
  
  let code = modifiedCodeLines.slice(0, 1085).join("\n") + "\n";
  
  // Append L1086-1100 from Step 99
  for (let i = 1086; i <= 1100; i++) {
    code += (step99Lines[i] || "") + "\n";
  }
  
  // Append L1101-1300 from Step 101
  for (let i = 1101; i <= 1300; i++) {
    code += (step101Lines[i] || "") + "\n";
  }
  
  // Append L1301-1500 from Step 103
  for (let i = 1301; i <= 1500; i++) {
    code += (step103Lines[i] || "") + "\n";
  }
  
  // Append L1501-1532 from translated JS
  const remainingLines = `                            messages.push({
                                role: "tool",
                                tool_call_id: (tc as any).id,
                                content: "Error: Directory not found"
                            });
                        }
                    }
                    else {
                        printToolError(funcName, \`Fungsi tool tidak dikenal.\`);
                        messages.push({
                            role: "tool",
                            tool_call_id: (tc as any).id,
                            content: \`Error: Unknown function \${funcName}\`
                        });
                    }
                }
            }
            else {
                if (fullResponse) {
                    messages.push({ role: "assistant", content: fullResponse });
                }
                isAgentDone = true;
            }
        }
        catch (error: any) {
            clearInterval(spinnerTimer);
            aiSpinner.stop('Error memproses respon');
            printToolError("AI Completion System", error.message);
            console.log();
            isAgentDone = true;
        }
    }
  }
}
`;
  code += remainingLines;
  
  // Now apply the subsequent edits sequentially starting from Step 89!
  const subsequentEdits = edits.filter(e => e.step > 79);
  subsequentEdits.forEach(e => {
    console.log(`Applying Step ${e.step} (${e.name})...`);
    if (e.name === "replace_file_content") {
      const target = e.args.TargetContent;
      const replacement = e.args.ReplacementContent;
      if (!code.includes(target)) {
        console.error(`  Warning: TargetContent not found in Step ${e.step}!`);
      } else {
        code = code.replace(target, replacement);
      }
    } else if (e.name === "multi_replace_file_content") {
      e.args.ReplacementChunks.forEach((chunk, cIdx) => {
        const target = chunk.TargetContent;
        const replacement = chunk.ReplacementContent;
        if (!code.includes(target)) {
          console.error(`  Warning: Chunk ${cIdx} not found in Step ${e.step}!`);
        } else {
          code = code.replace(target, replacement);
        }
      });
    }
  });
  
  // Fix setInterval type timer issue
  code = code.replace(/this\.timer = setInterval/g, "this.timer = setInterval as any");
  
  fs.writeFileSync("src/chat.ts", code);
  console.log("Rebuild complete!");
});
