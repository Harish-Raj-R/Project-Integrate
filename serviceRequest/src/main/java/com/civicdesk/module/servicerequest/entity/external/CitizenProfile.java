package com.civicdesk.module.serviceRequest.entity.external;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * TEMPORARY placeholder for the {@code citizen_profile} table owned by the Citizen module.
 *
 * <p>This module needs citizen profiles to exist so a submitted {@code service_request}
 * can carry a real foreign key, and so the linked {@code users} row can be checked for a
 * Flagged status. The Citizen team owns the real entity; when their module lands, delete
 * this class and repoint the {@code @ManyToOne citizen} in
 * {@link com.civicdesk.module.serviceRequest.entity.ServiceRequest} at their entity.
 * See {@code docs/serviceRequest-module.md}.</p>
 */
@Entity
@Table(name = "citizen_profile")
public class CitizenProfile {

    @Id
    @Column(name = "citizen_id", length = 16)
    private String citizenId;

    @Column(name = "user_id", nullable = false, length = 50, unique = true)
    private String userId;

    @Column(name = "national_id", length = 50)
    private String nationalId;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "ward", nullable = false, length = 50)
    private String ward;

    @Column(length = 50)
    private String zone;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "status", nullable = false, length = 1)
    private String status;

    public CitizenProfile() {
        // JPA + seeder construction
    }

    public CitizenProfile(String citizenId, String userId, String nationalId,
                          String address, String ward, String zone) {
        this.citizenId = citizenId;
        this.userId = userId;
        this.nationalId = nationalId;
        this.address = address;
        this.ward = ward;
        this.zone = zone;
        this.name = userId.equals("usr-c002") ? "Suresh Citizen" : (userId.equals("usr-c001") ? "Meena Citizen" : "Citizen " + userId);
        this.email = userId + "@example.com";
        this.phone = userId.equals("usr-c002") ? "9111100002" : (userId.equals("usr-c001") ? "9111100001" : "91111" + String.format("%05d", Math.abs(userId.hashCode() % 100000)));
        this.status = userId.equals("usr-c002") ? "F" : "A";
    }

    public String getCitizenId() {
        return citizenId;
    }

    public void setCitizenId(String citizenId) {
        this.citizenId = citizenId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getNationalId() {
        return nationalId;
    }

    public void setNationalId(String nationalId) {
        this.nationalId = nationalId;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public String getZone() {
        return zone;
    }

    public void setZone(String zone) {
        this.zone = zone;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
