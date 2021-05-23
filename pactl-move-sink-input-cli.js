#!/usr/bin/env node

const shell = require('shelljs')
const util = require('util')
const readline = require('readline')

// Get the lists of sinks and inputs from Pulseauio
const sinks = shell.exec('pactl list sinks', {silent: true}).stdout
const inputs = shell.exec('pactl list sink-inputs', {silent: true}).stdout

// Extract Arrays of useful stuff
const sinksRg = new RegExp(/Sink #(\d*)\s*State: (\w*)\s*[^\n]*\n\sDescription: ([^\n]*)\n/, 'mg')
const inputRg = new RegExp(/Sink Input #(\d+).*Sink: (\d+).*media\.name = "(\w*)"\s*application.name = "(\w*)"/, 'sg')
const sinkArr = Array.from(sinks.matchAll(sinksRg))
const inputArr = Array.from(inputs.matchAll(inputRg))

// Assuming 1 active input
// TODO: handle 0 and 2+ inputs
const defInput = inputArr[0]

// Find the sink for the chosen input
const curSink = sinkArr.find((i) => i[1] == defInput[2])
// Output info about active input/sink.
shell.echo(util.format('%s - %s - playing on %s', defInput[4], defInput[3], curSink[3]))

// List/number the non-active sinks
sinkArr.forEach((i, index) => { if (i[1] != curSink[1]) shell.echo(util.format('%s - %s', index, i[3])) })

// Prompt for new sink number
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "ENTER DEVICE #: ",
    terminal: true
});
rl.prompt();

// Get input
rl.on('line', function (cmd) {
    // Validate input
    if (sinkArr.map((i,index) => index).includes(parseInt(cmd))) {
        // Have pactl make the switch and quit
        shell.exec(util.format('pactl move-sink-input %d %d', inputArr[0][1], sinkArr[cmd][1] ))
        rl.close();
    } else {
        shell.echo("Invalid choice. Try again.")
    }
});
