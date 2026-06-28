const BASE_URL = 'http://localhost:8080/civicDesk';

async function testAll() {
    console.log("=== Starting API Testing Suite ===");
    
    // Helper to log test status
    const assertOk = (name, res, expectedStatus = 200) => {
        if (res.status === expectedStatus) {
            console.log(`[PASS] ${name} (Status: ${res.status})`);
            return true;
        } else {
            console.error(`[FAIL] ${name} (Expected Status: ${expectedStatus}, Actual: ${res.status})`);
            return false;
        }
    };

    try {
        // --- 1. Citizen Flow ---
        console.log("\n--- Testing Citizen Flow ---");
        
        // Register Citizen User (with retry to wait for Gateway & Eureka service sync)
        const regBody = {
            name: "Test Citizen",
            email: "citizen.test@example.com",
            password: "Password123!",
            phone: "9876543210",
            dateOfBirth: "1995-08-15",
            gender: "FEMALE",
            nationalId: "NID100200300",
            address: "456 Greenfield Ward",
            ward: "Ward-12",
            zone: "Zone-B"
        };
        
        let registerRes;
        for (let attempt = 1; attempt <= 15; attempt++) {
            console.log(`[ATTEMPT ${attempt}] Registering Citizen User...`);
            try {
                registerRes = await fetch(`${BASE_URL}/iam/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(regBody)
                });
                if (registerRes.status === 201) {
                    break;
                }
                console.warn(`Attempt ${attempt} returned status: ${registerRes.status}. Retrying in 5 seconds...`);
            } catch (err) {
                console.warn(`Attempt ${attempt} failed with error: ${err.message}. Retrying in 5 seconds...`);
            }
            await new Promise(r => setTimeout(r, 5000));
        }
        if (!assertOk("Citizen Registration", registerRes, 201)) return;
        
        // Login Citizen User
        const loginRes = await fetch(`${BASE_URL}/iam/auth/citizen/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: regBody.email, password: regBody.password })
        });
        if (!assertOk("Citizen Login", loginRes, 200)) return;
        const loginData = await loginRes.json();
        const citizenToken = loginData.data.token;
        const citizenUserId = loginData.data.userId;
        console.log(`> Citizen Logged In successfully. Token length: ${citizenToken.length}`);

        // Register Citizen Profile (with retry for Eureka discovery)
        let profileRes;
        for (let attempt = 1; attempt <= 15; attempt++) {
            try {
                profileRes = await fetch(`${BASE_URL}/citizenProfile/registerCitizen`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${citizenToken}`
                    },
                    body: JSON.stringify({
                        citizenId: citizenUserId,
                        name: regBody.name,
                        email: regBody.email,
                        phone: regBody.phone,
                        address: regBody.address,
                        ward: regBody.ward,
                        zone: regBody.zone,
                        nationalId: regBody.nationalId
                    })
                });
                if (profileRes.status === 201) {
                    break;
                }
            } catch (e) {
                // Ignore and retry
            }
            await new Promise(r => setTimeout(r, 3000));
        }
        if (!assertOk("Register Citizen Profile", profileRes, 201)) return;

        // --- 2. Admin Flow ---
        console.log("\n--- Testing Admin Flow ---");
        
        // Admin Login
        const adminLoginRes = await fetch(`${BASE_URL}/iam/auth/staff/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "admin@civicdesk.gov", password: "Admin@12345" })
        });
        if (!assertOk("Admin Login", adminLoginRes, 200)) return;
        const adminData = await adminLoginRes.json();
        const adminToken = adminData.data.token;
        console.log(`> Admin Logged In successfully. Token length: ${adminToken.length}`);

        // Admin Create a Catalog Service Item (with retry for Eureka discovery)
        let createServiceRes;
        for (let attempt = 1; attempt <= 15; attempt++) {
            try {
                createServiceRes = await fetch(`${BASE_URL}/serviceRequest/createService`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify({
                        serviceName: "Property Tax Registration",
                        departmentId: "DPT02",
                        category: "Registration",
                        processingDays: 14,
                        requiredDocuments: ["NationalID", "PropertyDeed", "TaxReceipt"],
                        fee: 500.00
                    })
                });
                if (createServiceRes.status === 201) {
                    break;
                }
            } catch (e) {
                // Ignore and retry
            }
            await new Promise(r => setTimeout(r, 3000));
        }
        if (!assertOk("Admin Create Catalog Service", createServiceRes, 201)) return;

        // List Active Services to get the created service's ID
        const servicesListRes = await fetch(`${BASE_URL}/serviceRequest/getAllServices`, {
            method: 'GET'
        });
        if (!assertOk("List Services", servicesListRes, 200)) return;
        const servicesList = await servicesListRes.json();
        const createdService = servicesList.find(s => s.serviceName === "Property Tax Registration");
        if (!createdService) {
            console.error("[FAIL] Created service not found in active services listing!");
            return;
        }
        const targetServiceId = createdService.serviceId;
        console.log(`> Found created service ID: ${targetServiceId}`);

        // Admin Get Citizen Profile to find realCitizenId
        const citizensRes = await fetch(`${BASE_URL}/citizenProfile/getAllCitizens`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (!assertOk("Get All Citizens", citizensRes, 200)) return;
        const citizens = await citizensRes.json();
        const targetCitizen = citizens.find(c => c.name === regBody.name);
        if (!targetCitizen) {
            console.error(`[FAIL] Citizen with name ${regBody.name} not found in listing!`);
            return;
        }
        const realCitizenId = targetCitizen.citizenId;
        console.log(`> Resolved Real Citizen ID: ${realCitizenId}`);

        // Admin Create Supervisor Account (DS)
        const supervisorEmail = "supervisor.test@civicdesk.gov";
        const createSupervisorRes = await fetch(`${BASE_URL}/iam/users`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: "Test Supervisor",
                email: supervisorEmail,
                phone: "9123456789",
                role: "DS",
                departmentId: "DPT02"
            })
        });
        if (!assertOk("Admin Create Supervisor", createSupervisorRes, 201)) return;

        // Set Password for Supervisor
        const setPasswordRes = await fetch(`${BASE_URL}/iam/auth/setPassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: supervisorEmail, newPassword: "Password123!" })
        });
        if (!assertOk("Supervisor Set Password", setPasswordRes, 200)) return;

        // Supervisor Login
        const supervisorLoginRes = await fetch(`${BASE_URL}/iam/auth/staff/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: supervisorEmail, password: "Password123!" })
        });
        if (!assertOk("Supervisor Login", supervisorLoginRes, 200)) return;
        const supervisorData = await supervisorLoginRes.json();
        const supervisorToken = supervisorData.data.token;
        console.log(`> Supervisor Logged In successfully. Token length: ${supervisorToken.length}`);

        // Supervisor Create Field Officer Account (FO)
        const officerEmail = "officer.test@civicdesk.gov";
        const createOfficerRes = await fetch(`${BASE_URL}/iam/users`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supervisorToken}`
            },
            body: JSON.stringify({
                name: "Test Officer",
                email: officerEmail,
                phone: "9112233445",
                role: "FO"
            })
        });
        if (!assertOk("Supervisor Create Field Officer", createOfficerRes, 201)) return;

        // List Users to get the created Field Officer's ID
        const listUsersRes = await fetch(`${BASE_URL}/iam/users?role=FO`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${supervisorToken}` }
        });
        if (!assertOk("List Users to resolve FO ID", listUsersRes, 200)) return;
        const usersListEnvelope = await listUsersRes.json();
        const usersList = usersListEnvelope.data.content;
        const createdOfficer = usersList.find(u => u.email === officerEmail);
        if (!createdOfficer) {
            console.error("[FAIL] Created Field Officer not found in listing!");
            return;
        }
        const realOfficerId = createdOfficer.userId;
        console.log(`> Resolved Field Officer ID: ${realOfficerId}`);

        // Set Password for Field Officer
        const setOfficerPasswordRes = await fetch(`${BASE_URL}/iam/auth/setPassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: officerEmail, newPassword: "Password123!" })
        });
        if (!assertOk("Field Officer Set Password", setOfficerPasswordRes, 200)) return;

        // --- 3. Service Request Workflow ---
        console.log("\n--- Testing Service Request Workflow ---");

        // Submit Service Request
        const submitReqRes = await fetch(`${BASE_URL}/serviceRequest/submitRequest`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${citizenToken}`
            },
            body: JSON.stringify({
                citizenId: realCitizenId,
                serviceId: targetServiceId
            })
        });
        if (!assertOk("Submit Service Request", submitReqRes, 201)) return;

        // List Requests (Supervisor)
        const listReqsRes = await fetch(`${BASE_URL}/serviceRequest/getAllRequests?status=S&departmentId=DPT02`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${supervisorToken}` }
        });
        if (!assertOk("List Service Requests", listReqsRes, 200)) return;
        const reqsList = await listReqsRes.json();
        const targetReqId = reqsList[0].requestId;
        console.log(`> Found submitted request ID: ${targetReqId}`);

        // Update Request Status (Supervisor)
        const updateStatusRes = await fetch(`${BASE_URL}/serviceRequest/updateRequestStatus/${targetReqId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supervisorToken}`
            },
            body: JSON.stringify({ newStatus: "U" })
        });
        if (!assertOk("Update Service Request Status (to UnderReview)", updateStatusRes, 200)) return;

        // --- 4. Permit Workflow ---
        console.log("\n--- Testing Permit Workflow ---");

        // Submit Permit (with retry for Eureka discovery)
        let submitPermitRes;
        for (let attempt = 1; attempt <= 15; attempt++) {
            try {
                submitPermitRes = await fetch(`${BASE_URL}/permits/createPermit`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${citizenToken}`,
                        'X-Citizen-Id': realCitizenId
                    },
                    body: JSON.stringify({
                        citizenId: realCitizenId,
                        permitType: "BuildingPermit",
                        propertyAddress: "789 Main Rd",
                        ward: "Ward-12",
                        zone: "Zone-B",
                        permitDetails: { description: "Residential construction" },
                        validityPeriod: 24,
                        fee: 2500.00
                    })
                });
                if (submitPermitRes.status === 201) {
                    break;
                }
            } catch (e) {
                // Ignore and retry
            }
            await new Promise(r => setTimeout(r, 3000));
        }
        if (!assertOk("Submit Permit Application", submitPermitRes, 201)) return;
        // List Permits to find the created permit's ID
        const listPermitsRes = await fetch(`${BASE_URL}/permits/getAllPermits`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${citizenToken}`,
                'X-Citizen-Id': realCitizenId
            }
        });
        if (!assertOk("List Permits to resolve ID", listPermitsRes, 200)) return;
        const permitsEnvelope = await listPermitsRes.json();
        const permitsList = permitsEnvelope.permits;
        const targetPermitId = permitsList[0].permitId;
        console.log(`> Resolved Permit ID: ${targetPermitId}`);

        // Schedule Inspection (Supervisor)
        const scheduleInspectionRes = await fetch(`${BASE_URL}/permits/${targetPermitId}/inspections`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supervisorToken}`
            },
            body: JSON.stringify({
                assignedOfficerId: realOfficerId,
                scheduledDate: "2026-07-15"
            })
        });
        if (!assertOk("Schedule Inspection", scheduleInspectionRes, 201)) return;

        // Final Decision (Supervisor)
        const decisionRes = await fetch(`${BASE_URL}/permits/${targetPermitId}/decision`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supervisorToken}`
            },
            body: JSON.stringify({
                decision: "Approved",
                rejectionReason: ""
            })
        });
        if (!assertOk("Register Permit Decision", decisionRes, 200)) return;

        // --- 5. Grievance Workflow ---
        console.log("\n--- Testing Grievance Workflow ---");

        // Submit Grievance (with retry for Eureka discovery)
        let submitGrievanceRes;
        for (let attempt = 1; attempt <= 15; attempt++) {
            try {
                submitGrievanceRes = await fetch(`${BASE_URL}/grievance/createGrievance`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${citizenToken}`
                    },
                    body: JSON.stringify({
                        grievanceTitle: "Water Logging in Street 4",
                        description: "Street 4 has been flooded since yesterday after heavy rains.",
                        category: "WS"
                    })
                });
                if (submitGrievanceRes.status === 201) {
                    break;
                }
            } catch (e) {
                // Ignore and retry
            }
            await new Promise(r => setTimeout(r, 3000));
        }
        if (!assertOk("Submit Grievance", submitGrievanceRes, 201)) return;
        const grievanceData = await submitGrievanceRes.json();
        const targetGrievanceId = grievanceData.data.grievanceId;
        console.log(`> Grievance created with ID: ${targetGrievanceId}`);

        // Resolve Grievance (Supervisor)
        const resolveGrievanceRes = await fetch(`${BASE_URL}/grievance/resolveGrievance/${targetGrievanceId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supervisorToken}`
            },
            body: JSON.stringify({
                message: "Drainage pumps deployed and street cleared."
            })
        });
        if (!assertOk("Resolve Grievance", resolveGrievanceRes, 200)) return;

        // --- 6. Notification Alerts ---
        console.log("\n--- Testing Notifications/Alerts ---");

        // Fetch Citizen Notifications (with retry for Eureka discovery)
        let fetchNotificationsRes;
        for (let attempt = 1; attempt <= 15; attempt++) {
            try {
                fetchNotificationsRes = await fetch(`${BASE_URL}/notificationsAlerts/fetchNotificationsByUser/${citizenUserId}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${citizenToken}` }
                });
                if (fetchNotificationsRes.status === 200) {
                    break;
                }
            } catch (e) {
                // Ignore and retry
            }
            await new Promise(r => setTimeout(r, 3000));
        }
        if (!assertOk("Fetch Notifications", fetchNotificationsRes, 200)) return;
        const alerts = await fetchNotificationsRes.json();
        console.log(`> Retrieved ${alerts.length} notifications successfully.`);

        console.log("\n=== All APIs Verified and Authorized Successfully ===");

    } catch (e) {
        console.error("System Error during E2E Verification:", e);
    }
}

// Run tests
testAll();
