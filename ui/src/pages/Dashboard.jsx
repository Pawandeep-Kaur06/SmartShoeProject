import React, { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, CheckCircle, Volume2, HardDrive, Cpu, Radio, Usb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  // UI State
  const [isConnected, setIsConnected] = useState(false);
  const [graphData, setGraphData] = useState([]);
  
  // Math & Logic State (Mirroring the Arduino C++)
  const [systemState, setSystemState] = useState({
    distance: 0,
    speed: 0,
    prediction: 'Waiting...',
    alertActive: false,
    beepMode: 'None'
  });

  // Short-term memory for the rolling average
  const historyRef = useRef([]);
  const lastTimeRef = useRef(Date.now());
  const lastSmoothedRef = useRef(0);

  // --- WEB SERIAL API LOGIC ---
  const connectToShoe = async () => {
    try {
      // 1. Ask Chrome for permission to access the USB port
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setIsConnected(true);

      // 2. Set up a stream to read text from the Arduino
      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let buffer = "";

      // 3. Continuous loop to read the data
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += value;
        const lines = buffer.split('\n');
        
        // If we have a full line of data ending in a newline
        if (lines.length > 1) {
          const rawDistance = parseFloat(lines[0].trim());
          buffer = lines[lines.length - 1]; // Keep the leftover chunk

          if (!isNaN(rawDistance)) {
            processSensorData(rawDistance);
          }
        }
      }
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Could not connect to the Smart Shoe. Make sure it's plugged in and no other program (like Arduino IDE) is using the port!");
      setIsConnected(false);
    }
  };

  // --- THE ML-OPTIMIZED MATH (Running in React) ---
  const processSensorData = (rawDist) => {
    const currentTime = Date.now();
    
    // 1. Rolling Average (Window = 5)
    historyRef.current.push(rawDist);
    if (historyRef.current.length > 5) {
      historyRef.current.shift(); // Keep only last 5
    }
    
    const smoothedDistance = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;

    // 2. Calculate Speed
    let speed = 0;
    const timeDiff = currentTime - lastTimeRef.current;
    
    if (timeDiff > 0 && lastSmoothedRef.current > 0) {
      speed = (smoothedDistance - lastSmoothedRef.current) / timeDiff;
    }

    // Update memory
    lastSmoothedRef.current = smoothedDistance;
    lastTimeRef.current = currentTime;

    // 3. The ML-Optimized Rules
    let prediction = 'safe';
    let alertOn = false;
    let beep = 'None';

    if (smoothedDistance < 20) {
      prediction = 'danger';
      alertOn = true;
      beep = 'Fast Beep / Continuous';
    } else if (smoothedDistance >= 20 && smoothedDistance <= 60 && speed < -0.05) {
      prediction = 'warning';
      alertOn = true;
      beep = 'Slow Beep';
    }

    // 4. Update the UI
    setSystemState({
      distance: Math.round(smoothedDistance),
      speed: speed,
      prediction: prediction,
      alertActive: alertOn,
      beepMode: beep
    });

    // 5. Update Graph
    setGraphData(prev => {
      const newData = [...prev, { 
        time: new Date().toLocaleTimeString().split(' ')[0], 
        distance: Math.round(smoothedDistance) 
      }];
      return newData.slice(-25); // Keep last 25 points on the graph
    });
  };

  // Helper variables for UI colors
  const isDanger = systemState.prediction === 'danger';
  const isWarning = systemState.prediction === 'warning';
  const isSafe = systemState.prediction === 'safe';

  return (
    <div className="p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* 🔝 HEADER & USB CONNECT */}
        <div className="border-b border-gray-800 pb-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-500" />
            Predictive Smart Shoe Dashboard
          </h1>
          <button 
            onClick={connectToShoe}
            disabled={isConnected}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              isConnected 
                ? 'bg-green-500/20 text-green-500 border border-green-500/50 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            <Usb className="w-5 h-5" />
            {isConnected ? 'Shoe Connected' : 'Connect to Shoe (USB)'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 📊 SECTION 1: SENSOR DATA */}
          <div className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-6 flex flex-col justify-center">
            <h2 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Live Telemetry</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm">Smoothed Distance</p>
                <p className="text-4xl font-mono font-bold">{systemState.distance} <span className="text-lg text-gray-500">cm</span></p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Approach Speed</p>
                <p className="text-4xl font-mono font-bold">{systemState.speed.toFixed(3)} <span className="text-lg text-gray-500">cm/ms</span></p>
              </div>
            </div>
          </div>

          {/* 🚦 SECTION 2: RISK INDICATOR */}
          <div className={`col-span-1 md:col-span-2 rounded-xl p-6 flex flex-col items-center justify-center border-2 transition-colors duration-300 ${
            isDanger ? 'bg-red-900/20 border-red-500 shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)]' : 
            isWarning ? 'bg-yellow-900/20 border-yellow-500 shadow-[0_0_50px_-12px_rgba(234,179,8,0.3)]' : 
            isSafe ? 'bg-green-900/20 border-green-500 shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)]' : 'bg-gray-900 border-gray-700'
          }`}>
            <h2 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-wider self-start">Environment Status</h2>
            
            {isDanger && (
              <div className="flex items-center gap-6 animate-pulse">
                <AlertTriangle className="w-20 h-20 text-red-500" />
                <h1 className="text-7xl font-black text-red-500 tracking-widest">DANGER</h1>
              </div>
            )}
            
            {isWarning && (
              <div className="flex items-center gap-6">
                <Activity className="w-20 h-20 text-yellow-500" />
                <h1 className="text-7xl font-black text-yellow-500 tracking-widest">WARNING</h1>
              </div>
            )}
            
            {isSafe && (
              <div className="flex items-center gap-6">
                <CheckCircle className="w-20 h-20 text-green-500" />
                <h1 className="text-7xl font-black text-green-500 tracking-widest">SAFE</h1>
              </div>
            )}

            {!isConnected && (
              <h1 className="text-3xl font-bold text-gray-600">Waiting for Hardware...</h1>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* 🔔 SECTION 3: ALERT STATUS */}
          <div className="bg-[#1E1E1E] border border-gray-800 rounded-xl p-6 flex flex-col justify-center">
            <h2 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Hardware Feedback</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Buzzer:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${systemState.alertActive ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                  {systemState.alertActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 flex items-center gap-2"><Volume2 className="w-4 h-4"/> Mode:</span>
                <span className="text-white font-medium pl-6">{systemState.beepMode}</span>
              </div>
            </div>
          </div>

          {/* 📈 SECTION 4: GRAPH */}
          <div className="col-span-1 md:col-span-3 bg-[#1E1E1E] border border-gray-800 rounded-xl p-6">
            <h2 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Distance vs Time</h2>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="time" stroke="#666" fontSize={12} tickFormatter={() => ''} />
                  <YAxis stroke="#666" fontSize={12} domain={[0, 200]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121212', borderColor: '#333' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`${value} cm`, "Distance"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="distance" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* ⚙️ SECTION 5: SYSTEM INFO */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 flex flex-wrap gap-8 justify-center text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span>Sensor: <strong>HC-SR04</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            <span>Controller: <strong>Arduino Uno</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <span>Logic: <strong>Hybrid Edge Computing</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;