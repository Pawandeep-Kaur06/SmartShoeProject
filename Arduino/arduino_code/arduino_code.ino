#define trigPin 9
#define echoPin 8
#define BUZ 13

long duration;
float distance;

void setup()
{
  Serial.begin(9600);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(BUZ, OUTPUT);
}

void loop()
{

  // Send ultrasonic pulse
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Read echo
  duration = pulseIn(echoPin, HIGH);

  // Convert to distance (cm)
  distance = duration / 58.2;

  // Print for logging
  Serial.print(millis());
  Serial.print(",");
  Serial.println(distance);

  // -------- Smart Alert System --------

  if(distance < 20)
{
  digitalWrite(BUZ, HIGH);   // danger
}

else if(distance < 50)
{
  digitalWrite(BUZ, HIGH);
  delay(100);
  digitalWrite(BUZ, LOW);
  delay(100);
}

else if(distance < 100)
{
  digitalWrite(BUZ, HIGH);
  delay(400);
  digitalWrite(BUZ, LOW);
  delay(400);
}

else
{
  digitalWrite(BUZ, LOW);
}
}
