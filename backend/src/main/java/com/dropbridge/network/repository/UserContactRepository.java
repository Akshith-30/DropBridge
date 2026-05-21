package com.dropbridge.network.repository;

import com.dropbridge.network.model.UserContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserContactRepository extends JpaRepository<UserContact, UUID> {

    List<UserContact> findByOwnerUserIdOrderByAddedAtDesc(UUID ownerUserId);

    Optional<UserContact> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);

    boolean existsByOwnerUserIdAndContactUserId(UUID ownerUserId, UUID contactUserId);

    @Query("SELECT DISTINCT c.ownerUserId FROM UserContact c WHERE c.contactUserId = :contactUserId")
    List<UUID> findOwnerUserIdsWatchingUser(@Param("contactUserId") UUID contactUserId);
}
