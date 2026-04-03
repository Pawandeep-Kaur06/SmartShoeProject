#define trigPin 9
#define echoPin 8
#define BUZ 13

// ML-Derived Constants
const int WINDOW_SIZE = 5;
long history[5] = {0, 0, 0, 0, 0}; 
int historyIndex = 0;

unsigned long lastTime = 0;
long lastSmoothedDistance = 0;

void setup() {
  Serial.begin(9600);
  pinMode(BUZ, OUTPUT);
  pinMode(trigPin, OUTPUT); 
  pinMode(echoPin, INPUT);   
}

void loop() {
  unsigned long currentTime = millis();
  
  // 1. Get Raw Distance
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);   
  digitalWrite(trigPin, HIGH); 
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long rawDistance = pulseIn(echoPin, HIGH) / 58.2;
  
  // 2. Rolling Average (Smooth the Data)
  history[historyIndex] = rawDistance;
  historyIndex = (historyIndex + 1) % WINDOW_SIZE;
  
  long sum = 0;
  for(int i = 0; i < WINDOW_SIZE; i++) {
    sum += history[i];
  }
  long smoothedDistance = sum / WINDOW_SIZE;

  // 3. Calculate Speed (Change in distance / time)
  float speed = 0;
  unsigned long timeDiff = currentTime - lastTime;
  
  if (timeDiff > 0 && lastSmoothedDistance > 0) {
    speed = (float)(smoothedDistance - lastSmoothedDistance) / timeDiff;
  }
  
  lastSmoothedDistance = smoothedDistance;
  lastTime = currentTime;

  // 4. ML-Optimized Rules
  if (smoothedDistance < 25) {
    // DANGER: Object is extremely close
    beep(50); 
  } 
  else if (smoothedDistance >= 25 && smoothedDistance <= 65 && speed < -0.05) {
    // WARNING: Object is in mid-range AND approaching quickly
    beep(200); 
  } 
  else {
    // SAFE: Either far away or standing still
    digitalWrite(BUZ, LOW);
  }

  Serial.println(smoothedDistance);
  
  // Delay to stabilize readings
  delay(100); 
}

// Helper function to handle buzzer timing
void beep(int delayTime) {
  digitalWrite(BUZ, HIGH);
  delay(delayTime);
  digitalWrite(BUZ, LOW);
}