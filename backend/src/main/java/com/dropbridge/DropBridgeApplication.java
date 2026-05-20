package com.dropbridge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DropBridgeApplication {

	public static void main(String[] args) {
		SpringApplication.run(DropBridgeApplication.class, args);
	}

}
