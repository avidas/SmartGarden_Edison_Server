/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

var http = require('http');
var request = require('request');
var querystring = require('querystring');
var m = require('mraa'); //IO Library
var app = require('express')(); //Express Library
var server = require('http').Server(app); //Create HTTP instance

var io = require('socket.io')(server); //Socket.IO Library

var blinkInterval = 1000; //set default blink interval to 1000 milliseconds (1 second)
var ledState = 1; //set default LED state

var myLed = new m.Gpio(13); //LED hooked up to digital pin 13
var toggleLed = "blink";
myLed.dir(m.DIR_OUT); //set the gpio direction to output
var analogPin0 = new m.Aio(0);
var analogPin1 = new m.Aio(1);
var analogPin2 = new m.Aio(2);
var analogPin3 = new m.Aio(3);

//Read Light Sensor//
function getLux(analogValue) {
  // Values taken from Grove Starter Kit for Arduino table
  var lux;
  var calib = [{reading:0, lux:0},
               {reading:100, lux:0.2},  // guess - not from published table
               {reading:200, lux:1},
               {reading:300, lux:3},
               {reading:400, lux:6},
               {reading:500, lux:10},
               {reading:600, lux:15},
               {reading:700, lux:35},
               {reading:800, lux:80},
               {reading:900, lux:100}];
  var i = 0;
  while (i < calib.length && calib[i].reading < analogValue) {
    i ++;
  }
  if (i > 0) {
    i = i - 1;
  }
  // simple linear interpolation 
  lux =  (calib[i].lux *(calib[i + 1].reading - analogValue) + calib[i + 1].lux * (analogValue - calib[i].reading))/(calib[i + 1].reading - calib[i].reading);
  return lux;
}

var lightReading;

app.get('/', function (req, res) {                  
    res.sendFile(__dirname + '/index.html'); //serve the static html file
}); 



app.get('/led/on', function (req, res) {
    toggleLed = "toggle";
    ledState = 1;
    res.sendStatus(200);
});

app.get('/led/off', function (req, res) {
    toggleLed = "toggle";
    ledState = 0;
    res.sendStatus(200);
});

io.on('connection', function(socket){
    socket.on('changeBlinkInterval', function(data){ //on incoming websocket message...
        toggleLed = "blink";
        blinkInterval = data; //update blink interval
    });
    socket.on('turnOnLED', function(){
        toggleLed = "toggle";
        ledState = 1;
    });
    socket.on('turnOffLED', function(){
        toggleLed = "toggle";
        ledState = 0;
    });
});                                                   

server.listen(3000); //run on port 3000
console.log("We are running...");
blink(); //start the blink functionls

function blink(){                                                                               
    if(toggleLed == "toggle"){
        myLed.write(ledState); 
        console.log("toggle LED", ledState);
        setTimeout(blink,1000);
    }
    
    if(toggleLed == "blink"){
        console.log("blink LED");
        myLed.write(ledState); //write the LED state
        ledState = 1 - ledState; //toggle LED state
        setTimeout(blink,blinkInterval); //recursively toggle pin state with timeout set to blink interval
    }
}

app.get('/test', function (req, res) {
    lightReading = analogPin0.read();
    res.json({lightValue: lightReading}); //serve the static html file
}); 

                                                                     
function sendLSData(){
    var tempSensor = analogPin0.read();
    var lightSensor = analogPin1.read();
    var moistureSensor = analogPin2.read();
    var waterSensor = analogPin3.read();
    request({                                                               
      url: 'http://smartgarden.meteor.com/tasks/YS5Y3nDqaojXYXnZz',         
      method: 'PATCH',                                                      
      json: {
          tempSensor: tempSensor,
          lightSensor: (lightSensor/1023)*100,
          moistureSensor: moistureSensor,
          waterSensor: waterSensor
      }                                                                     
    },                                                                      
      function (error, response, body) {                                    
          if (!error && response.statusCode == 200) {                       
                console.log(body) // Show the HTML for the Google homepage. 
        }                                                                   
    });

    setTimeout(sendLSData, 2000);
}

sendLSData();