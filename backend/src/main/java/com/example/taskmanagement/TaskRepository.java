package com.example.taskmanagement;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {

	List<Task> findAllByOrderByStatusAscPositionAsc();

	int countByStatus(String status);
}
