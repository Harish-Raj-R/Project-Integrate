# Stop any existing jobs first
Get-Job | Stop-Job
Get-Job | Remove-Job

# 1. Start Eureka Server
Write-Host "Starting Eureka Server as background job..."
Start-Job -Name "eureka-server" -ScriptBlock { Set-Location "c:\Users\Harishraj\Documents\CivicDesk"; mvn spring-boot:run -pl eureka-server }
Write-Host "Waiting 12 seconds for Eureka Server to warm up..."
Start-Sleep -Seconds 12

# 2. Start downstream microservices
$services = @("iam", "citizenProfile", "grievance", "serviceRequest", "permit", "publicWorks", "notification")
foreach ($svc in $services) {
    Write-Host "Starting $svc as background job..."
    Start-Job -Name $svc -ScriptBlock { Set-Location "c:\Users\Harishraj\Documents\CivicDesk"; mvn spring-boot:run -pl $using:svc }
    Start-Sleep -Seconds 2
}

# 3. Start API Gateway
Write-Host "Starting API Gateway as background job..."
Start-Job -Name "api-gateway" -ScriptBlock { Set-Location "c:\Users\Harishraj\Documents\CivicDesk"; mvn spring-boot:run -pl api-gateway }

Write-Host "All services started as background jobs!"
Write-Host "Use 'Get-Job' to check their status."
