package com.dwth_system.user.entity;

import com.dwth_system.user.dto.UserDTO;
import com.dwth_system.user.utility.Roles;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    private String id;

    private String name;

    @Column(unique = true)
    private String email;

    private String password;

    private Roles role;

    public UserDTO toDTO() {
        return new UserDTO(this.id, this.name, this.email, this.password, this.role);
    }
}
