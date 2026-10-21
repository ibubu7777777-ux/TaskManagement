package com.example.taskmanagement;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tasks")
public class Task {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String title;

	@Column(columnDefinition = "TEXT")
	private String description;

	// todo / doing / done
	@Column(nullable = false)
	private String status;

	// high / mid / low
	@Column(nullable = false)
	private String priority;

	@Column(name = "due_date")
	private LocalDate dueDate;

	@Column(nullable = false)
	private int position;

	protected Task() {
	}

	public Task(String title, String description, String status, String priority, LocalDate dueDate, int position) {
		this.title = title;
		this.description = description;
		this.status = status;
		this.priority = priority;
		this.dueDate = dueDate;
		this.position = position;
	}

	public Long getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public String getDescription() {
		return description;
	}

	public String getStatus() {
		return status;
	}

	public String getPriority() {
		return priority;
	}

	public LocalDate getDueDate() {
		return dueDate;
	}

	public int getPosition() {
		return position;
	}
}
