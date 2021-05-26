#!/usr/bin/env node
const { resolve } = require('path');
const shell = require('shelljs')
const readline = require('readline');
const util = require('util')

const inputsRg = new RegExp(/Sink Input #(\d+).*Sink: (\d+).*media\.name = "(\w*)"\s*application.name = "(\w*)"/, 'sg')
const sinksRg = new RegExp(/Sink #(\d*)\s*State: (\w*)\s*[^\n]*\n\sDescription: ([^\n]*)\n/, 'mg')

async function getSinkInputs(){
    return new Promise((resolve, reject) => {
        try {
            const inputsTxt = shell.exec('pactl list sink-inputs', {silent: true}).stdout
            resolve(inputsTxt)
        } catch(error) {
            reject(error)
        }
    });
}

async function tokenizeInputs(inputsTxt) {
    return new Promise((resolve, reject) => {
        const inputArr = []
        inputsTxt.split('\n\n').filter(Boolean).map(inputTxt=>inputArr.push(Array.from(inputTxt.matchAll(inputsRg))[0]))
        resolve(inputArr)
    });
}

async function getInputChoice(inputArr){
    return new Promise((resolve, reject) => {
        if (inputArr.length == 0){
            reject("No active input found in PulseAudio. Nothing to do.\nExiting...")
        }
        else if (inputArr.length == 1){
            resolve(inputArr[0])
        } else {
            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            })
            var inputChoice
            var inputList = 'Multiple inputs found\n'
            inputArr.map((i, index)=>inputList += index + ': ' + i[4] + '-' + i[3] + '\n')
            rl.setPrompt(inputList + 'Enter # of input to be moved>')
            rl.on('line', line => {
                if (inputArr.map((i,index) => index).includes(parseInt(line))) {
                    inputChoice = inputArr[parseInt(line)]
                    rl.close()
                } else {
                    rl.setPrompt('\nInvalid choice. Try again. >')
                    rl.prompt()
                }
            })
            rl.on('close', _=>{
                resolve(inputChoice)
            })
            rl.prompt()
        }
    });
}

async function getSinks(){
    return new Promise((resolve, reject) => {
        try {
            const sinksTxt = shell.exec('pactl list sinks', {silent: true}).stdout
            resolve(sinksTxt)
        } catch(error) {
            reject(error)
        }
    });
}

async function tokenizeSinks(sinksTxt) {
    return new Promise((resolve, reject) => {
        const sinkArr = Array.from(sinksTxt.matchAll(sinksRg))
        resolve(sinkArr)
    });
}

async function getSinkChoice(sinkArr, defInput) {
    return new Promise((resolve, reject) => {
        // Find the sink for the chosen input
        const curSink = sinkArr.find((i) => i[1] == defInput[2])

        // Output info about active input/sink.
        var promptTxt = util.format('%s - %s - playing on %s\n', defInput[4], defInput[3], curSink[3])
        // List/number the non-active sinks
        sinkArr.forEach((i, index) => { if (i[1] != curSink[1]) promptTxt += util.format('%s - %s\n', index, i[3]) })
        promptTxt += 'Enter # of target to move to>'
        // Prompt for new sink number
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            prompt: promptTxt
        });
        var resp
        rl.on('line', line => {
            if (sinkArr.map((i,index) => index).includes(parseInt(line))) {
                sinkChoice = sinkArr[parseInt(line)]
                rl.close()
            } else {
                rl.setPrompt('\nInvalid choice. Try again. >')
                rl.prompt()
            }
        })
        rl.on('close', _=>{
            resolve(sinkChoice)
        })
        rl.prompt();
    });
}

function main() {
    getSinkInputs()
    .then(tokenizeInputs)
    .then(getInputChoice)
    .then(function(inputChoice) {
        sinkChoice = getSinks()
        .then(tokenizeSinks)
        .then(function (sinkArr) {
            getSinkChoice(sinkArr, inputChoice).
            then(function(sinkChoice){
                shell.exec(util.format('pactl move-sink-input %d %d', inputChoice[1], sinkChoice[1] ))
            })
            .catch(err=>shell.echo(err))
        })
        .catch(err=>shell.echo(err))
    })
    .catch(err=>shell.echo(err))
}

main();