# First kill any running java processes to start clean
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force

# 1. Start Eureka Server
Write-Host "Starting Eureka Server..."
Start-Process java -ArgumentList "-jar eureka-server\target\eureka-server-0.0.1-SNAPSHOT.jar" -NoNewWindow
Write-Host "Waiting 12 seconds for Eureka Server to warm up..."
Start-Sleep -Seconds 12

# 2. Start downstream microservices
$jars = @(
    "iam\target\iam-0.0.1-SNAPSHOT.jar",
    "citizenProfile\target\citizenProfile-0.0.1-SNAPSHOT.jar",
    "grievance\target\grievance-0.0.1-SNAPSHOT.jar",
    "serviceRequest\target\serviceRequest-0.0.1-SNAPSHOT.jar",
    "permit\target\permit-0.0.1-SNAPSHOT.jar",
    "publicWorks\target\publicWorks-0.0.1-SNAPSHOT.jar",
    "notification\target\notification-0.0.1-SNAPSHOT.jar"
)

foreach ($jar in $jars) {
    Write-Host "Starting $jar..."
    Start-Process java -ArgumentList "-jar $jar" -NoNewWindow
    Start-Sleep -Seconds 2
}

# 3. Start API Gateway
Write-Host "Starting API Gateway..."
Start-Process java -ArgumentList "-jar api-gateway\target\api-gateway-0.0.1-SNAPSHOT.jar" -NoNewWindow

Write-Host "All microservices launched successfully as background processes!"
