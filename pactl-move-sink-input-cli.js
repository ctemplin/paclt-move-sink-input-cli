#!/usr/bin/env node
const shell = require('shelljs')
const readline = require('readline');
const util = require('util')
const {getInputs, getSinks} = require('pactl-lists-json')

let excludedSinkIds = []
let excludeCorkedInputs = false
process.argv.map((a, index) => { 
    if (a=='-x') excludedSinkIds.push(parseInt(process.argv[index+1]))
    if (a=='--excludeCorkedInputs') excludeCorkedInputs = true 
})

async function getInputChoice(inputArr){
    if (excludeCorkedInputs) {
        inputArr = inputArr.filter((i) => i.Corked != 'yes')
    }
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
            inputArr.map((i, index)=>inputList += util.format('%d: %s - %s\n', index, i['application.name'], i['media.name']))*
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

async function getSinkChoice(sinkArr, defInput) {
    return new Promise((resolve, reject) => {
        // Find the sink for the chosen input
        const curSink = sinkArr.find((i) => i.Sink == defInput.Sink)
        // Remove the active sink from the list of target sinks
        sinkArr.splice(sinkArr.indexOf(curSink), 1)
        // Remove sinks excluded per command line arg(s)
        excludedSinkIds.forEach(exSinkArg => {
            exSinkIndex = sinkArr.findIndex(sink => sink.Sink == exSinkArg)
            if (exSinkIndex != -1) {sinkArr.splice(exSinkIndex, 1)}
        })
        // if there's only one non-active sync choice left, choose it
        if (sinkArr.length == 1) {
            const autoMoveMsg = util.format('Moving %s - %s to %s.\nExiting...', defInput['application.name'], defInput['media.name'], sinkArr[0].Description)
            displayMsgAndPause(autoMoveMsg)
            resolve(sinkArr[0])
        } else {
            // Output info about active input/sink.
            var promptTxt = util.format('%s - %s - playing on %s\n', defInput['application.name'], defInput['media.name'], curSink.Description)
            // List/number the non-active sinks
            sinkArr.forEach((i, index) => { promptTxt += util.format('%s - %s\n', index+1, i.Description) })
            promptTxt += 'Enter # of target to move to >'
            // Prompt for new sink number
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true,
                prompt: promptTxt
            });
            var resp
            rl.on('line', line => {
                const choiceIndex = parseInt(line) - 1 // NaN - 1 = -1
                if (sinkArr.map((i,index) => index).includes(choiceIndex)) {
                    sinkChoice = sinkArr[choiceIndex]
                    rl.close()
                } else {
                    rl.setPrompt(util.format('Invalid choice. Choose from 1 - %d >', sinkArr.length))
                    rl.prompt()
                }
            })
            rl.on('close', _=>{
                resolve(sinkChoice)
            })
            rl.prompt();
        }
    });
}

function displayMsgAndPause(msg){
    shell.echo(msg);
    setTimeout(_=>{}, 2000)
}

function main() {
    getInputs()
    .then(getInputChoice)
    .then(function(inputChoice) {
        sinkChoice = getSinks()
        .then(function (sinkArr) {
            getSinkChoice(sinkArr, inputChoice).
            then(function(sinkChoice){
                shell.exec(util.format('pactl move-sink-input %d %d', inputChoice['Sink Input'], sinkChoice.Sink ))
            })
            .catch(err=>{displayMsgAndPause(err)})
        })
        .catch(err=>{displayMsgAndPause(err)})
    })
    .catch(err=>{displayMsgAndPause(err)})
}

main();
