const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3041;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trial2.html'));
});

app.post('/run-cpp', (req, res) => {
    const code = req.body.code;
    const cppDir = path.join(__dirname, 'cpp');
    const filePath = path.join(cppDir, 'code.cpp');
    const outputFilePath = path.join(cppDir, 'code.out');

    // Ensure the cpp directory exists
    if (!fs.existsSync(cppDir)){
        fs.mkdirSync(cppDir);
    }

    // Save the C++ code to a file
    fs.writeFile(filePath, code, (err) => {
        if (err) {
            console.error('Error writing code to file:', err.message);
            return res.json({ success: false, error: err.message });
        }

        // Log the file paths for debugging
        console.log(`File path: ${filePath}`);
        console.log(`Output file path: ${outputFilePath}`);

        // Compile the C++ code
        exec(`g++ "${filePath}" -o "${outputFilePath}"`, (compileError, compileStdout, compileStderr) => {
            if (compileError) {
                console.error('COMPILATION ERROR:', compileStderr || compileError.message);
                return res.json({ success: false, error: compileStderr || compileError.message });
            }

            // Log compilation success
            console.log('Compilation successful');

            // Check if the output file was created
            fs.access(outputFilePath, fs.constants.F_OK, (accessErr) => {
                if (accessErr) {
                    console.error(`Output file not found: ${outputFilePath}`);
                    return res.json({ success: false, error: `Output file not found: ${outputFilePath}` });
                }

                // Set permissions to the output file
                fs.chmod(outputFilePath, 0o755, (chmodErr) => {
                    if (chmodErr) {
                        console.error(`Error setting permissions on ${outputFilePath}: ${chmodErr.message}`);
                        return res.json({ success: false, error: `Error setting permissions on ${outputFilePath}: ${chmodErr.message}` });
                    }

                    // Execute the compiled C++ code
                    exec(`"${outputFilePath}"`, (runError, runStdout, runStderr) => {
                        if (runError) {
                            console.error('Runtime error:', runStderr || runError.message);
                            return res.json({ success: false, error: runStderr || runError.message });
                        }

                        // Log execution success
                        console.log('Execution successful');
                        console.log(runStdout);
                        // Return the output
                        res.json({ success: true, output: runStdout });

                        // Clean up the compiled output file after execution
                        fs.unlink(outputFilePath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error(`Error deleting compiled file: ${unlinkErr.message}`);
                            }
                            else console.error('worked fine'); 
                        });
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
