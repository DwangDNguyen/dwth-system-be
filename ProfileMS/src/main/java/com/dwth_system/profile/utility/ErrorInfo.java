package com.dwth_system.profile.utility;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ErrorInfo {

    private String message;
    private Integer status;
    private LocalDateTime timestamp;
}
