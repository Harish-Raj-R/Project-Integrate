# CivicDesk Microservices Run Script
# This script starts all services in separate PowerShell windows/jobs.

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting CivicDesk Microservices System" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Start Eureka Server
Write-Host "Starting Eureka Server on port 8761..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Title 'Eureka Server'; mvn spring-boot:run -pl eureka-server"
Write-Host "Waiting 12 seconds for Eureka Server to warm up..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# 2. Start all microservices
$services = @(
    @{ Name = "IAM Service"; Project = "iam" },
    @{ Name = "Citizen Profile"; Project = "citizenProfile" },
    @{ Name = "Grievance Service"; Project = "grievance" },
    @{ Name = "Service Request"; Project = "serviceRequest" },
    @{ Name = "Permit Service"; Project = "permit" },
    @{ Name = "Public Works"; Project = "publicWorks" },
    @{ Name = "Notification Service"; Project = "notification" }
)

foreach ($svc in $services) {
    Write-Host "Starting $($svc.Name)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Title '$($svc.Name)'; mvn spring-boot:run -pl $($svc.Project)"
    Start-Sleep -Seconds 2  # Brief pause to stagger startup
}

# 3. Start API Gateway
Write-Host "Starting API Gateway on port 8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Title 'API Gateway'; mvn spring-boot:run -pl api-gateway"

Write-Host "=============================================" -ForegroundColor Green
Write-Host "All services startup commands issued!" -ForegroundColor Green
Write-Host "Check the new PowerShell windows for logs." -ForegroundColor Green
Write-Host "Eureka Dashboard: http://localhost:8761" -ForegroundColor Green
Write-Host "API Gateway Port: http://localhost:8080" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
