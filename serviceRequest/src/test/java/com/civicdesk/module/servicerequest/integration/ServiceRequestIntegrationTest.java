package com.civicdesk.module.serviceRequest.integration;

import com.civicdesk.module.serviceRequest.entity.ServiceCatalog;
import com.civicdesk.module.serviceRequest.entity.enums.ServiceCategory;
import com.civicdesk.module.serviceRequest.entity.enums.ServiceStatus;
import com.civicdesk.module.serviceRequest.entity.external.CitizenProfile;
import com.civicdesk.module.serviceRequest.entity.external.Department;
import com.civicdesk.module.serviceRequest.entity.external.User;
import com.civicdesk.module.serviceRequest.repository.CitizenProfileRepository;
import com.civicdesk.module.serviceRequest.repository.DepartmentRepository;
import com.civicdesk.module.serviceRequest.repository.ServiceCatalogRepository;
import com.civicdesk.module.serviceRequest.repository.ServiceRequestRepository;
import com.civicdesk.module.serviceRequest.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests: real HTTP -> controller -> service -> JPA -> H2, exercising
 * the data seeded locally at startup. {@code @Transactional} rolls back
 * each test's writes so the seeded baseline is left untouched between tests.
 *
 * <p>Known seeded data: citizen-0001 (Active) and citizen-0002 (Flagged); svc-0001 / svc-0002
 * (Active) and svc-0003 (Inactive); active officers in dept-0004 and dept-0002.</p>
 */
@SpringBootTest(properties = {
    "app.jwt.secret=civicdesk_hs256_secret_key_minimum_32_characters_required",
    "app.jwt.expiry=1800000"
})
@AutoConfigureMockMvc
@Transactional
class ServiceRequestIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ServiceRequestRepository requestRepository;
    @Autowired private DepartmentRepository departmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CitizenProfileRepository citizenProfileRepository;
    @Autowired private ServiceCatalogRepository catalogRepository;
    @Autowired private com.civicdesk.common.util.JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        Department citizenServices = departmentRepository.save(new Department("dept-0004", "Citizen Services", "citizenservices@civicdesk.gov"));
        Department publicWorks = departmentRepository.save(new Department("dept-0002", "Public Works", "publicworks@civicdesk.gov"));

        userRepository.saveAll(List.of(
                new User("off-0004", "Arjun Officer", "arjun@civicdesk.gov", "9000000004", "Officer", "dept-0004", "A"),
                new User("off-0006", "Priya Officer", "priya@civicdesk.gov", "9000000006", "Officer", "dept-0004", "A"),
                new User("off-0002", "Ravi Officer", "ravi@civicdesk.gov", "9000000002", "Officer", "dept-0002", "A"),
                new User("usr-c001", "Meena Citizen", "meena@example.com", "9111100001", "Citizen", null, "A"),
                new User("usr-c002", "Suresh Citizen", "suresh@example.com", "9111100002", "Citizen", null, "F")
        ));

        citizenProfileRepository.saveAll(List.of(
                new CitizenProfile("citizen-0001", "usr-c001", "NID0001", "12 MG Road", "Ward-5", "Zone-A"),
                new CitizenProfile("citizen-0002", "usr-c002", "NID0002", "7 Park Street", "Ward-3", "Zone-B")
        ));

        catalogRepository.saveAll(List.of(
                catalogService("svc-0001", "Birth Certificate", citizenServices, ServiceCategory.Certificate,
                        7, "[\"NationalID\",\"HospitalBirthRecord\",\"ParentID\"]", "150.00", ServiceStatus.Active),
                catalogService("svc-0002", "Income Certificate", citizenServices, ServiceCategory.Certificate,
                        10, "[\"NationalID\",\"SalarySlip\",\"ResidenceProof\"]", "100.00", ServiceStatus.Active),
                catalogService("svc-0003", "Drainage Connection", publicWorks, ServiceCategory.Utility,
                        14, "[\"NationalID\",\"ResidenceProof\",\"SiteMap\"]", "750.00", ServiceStatus.Inactive)
        ));
    }

    private ServiceCatalog catalogService(String id, String name, Department department,
                                          ServiceCategory category, int processingDays,
                                          String requiredDocsJson, String fee, ServiceStatus status) {
        ServiceCatalog service = new ServiceCatalog();
        service.setServiceId(id);
        service.setServiceName(name);
        service.setDepartment(department);
        service.setCategory(category);
        service.setProcessingDays(processingDays);
        service.setRequiredDocuments(requiredDocsJson);
        service.setFee(new java.math.BigDecimal(fee));
        service.setStatus(status);
        return service;
    }

    @Test
    @DisplayName("getAllServices returns only the Active seeded services")
    void getAllServicesReturnsActiveOnly() throws Exception {
        mockMvc.perform(get("/civicDesk/serviceRequest/getAllServices"))
                .andExpect(status().isOk())
                // svc-0001 and svc-0002 are Active; svc-0003 is Inactive and must be excluded.
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("submitRequest persists a request and auto-assigns an officer (201)")
    void submitRequestSucceeds() throws Exception {
        long before = requestRepository.count();
        String token = jwtUtil.generateToken("usr-c001", "CIT");

        mockMvc.perform(post("/civicDesk/serviceRequest/submitRequest")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"citizenId\":\"citizen-0001\",\"serviceId\":\"svc-0001\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").exists());

        org.assertj.core.api.Assertions.assertThat(requestRepository.count()).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("submitRequest by a Flagged citizen is forbidden (403)")
    void submitRequestFlaggedCitizenForbidden() throws Exception {
        String token = jwtUtil.generateToken("usr-c002", "CIT");

        mockMvc.perform(post("/civicDesk/serviceRequest/submitRequest")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"citizenId\":\"citizen-0002\",\"serviceId\":\"svc-0001\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("submitRequest against an Inactive service is unprocessable (422)")
    void submitRequestInactiveServiceUnprocessable() throws Exception {
        String token = jwtUtil.generateToken("usr-c001", "CIT");

        mockMvc.perform(post("/civicDesk/serviceRequest/submitRequest")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"citizenId\":\"citizen-0001\",\"serviceId\":\"svc-0003\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("submitRequest for an unknown service returns 404")
    void submitRequestUnknownServiceNotFound() throws Exception {
        String token = jwtUtil.generateToken("usr-c001", "CIT");

        mockMvc.perform(post("/civicDesk/serviceRequest/submitRequest")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"citizenId\":\"citizen-0001\",\"serviceId\":\"does-not-exist\"}"))
                .andExpect(status().isNotFound());
    }
}
