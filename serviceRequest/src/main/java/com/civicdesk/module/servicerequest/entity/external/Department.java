package com.civicdesk.module.serviceRequest.entity.external;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * TEMPORARY placeholder for the {@code departments} table owned by the IAM module.
 *
 * <p>This module only needs departments to exist so its {@code service_catalog} rows can
 * carry a real foreign key. The IAM team owns the real entity; when their module lands,
 * delete this class (and the rest of the {@code entity/external} package) and repoint the
 * {@code @ManyToOne} in {@link com.civicdesk.module.serviceRequest.entity.ServiceCatalog}
 * at their entity. See {@code docs/serviceRequest-module.md}.</p>
 */
@Entity
@Table(name = "departments")
public class Department {

    @Id
    @Column(name = "departmentId", length = 10, updatable = false, nullable = false)
    private String departmentId;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @jakarta.persistence.Transient
    private String email;

    public Department() {
        // JPA + seeder construction
    }

    public Department(String departmentId, String departmentName, String email) {
        this.departmentId = departmentId;
        this.name = departmentName;
        this.email = email;
    }

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    public String getDepartmentName() {
        return name;
    }

    public void setDepartmentName(String departmentName) {
        this.name = departmentName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
