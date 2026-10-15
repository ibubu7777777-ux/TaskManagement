package com.example.taskmanagement;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

	private static final Set<String> STATUSES = Set.of("todo", "doing", "done");

	record CreateTaskRequest(String title, String description, String status, String priority, LocalDate dueDate) {
	}

	private final TaskRepository taskRepository;

	public TaskController(TaskRepository taskRepository) {
		this.taskRepository = taskRepository;
	}

	@GetMapping
	public List<Task> list() {
		return taskRepository.findAllByOrderByStatusAscPositionAsc();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Task create(@RequestBody CreateTaskRequest req) {
		if (req.title() == null || req.title().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
		}
		String status = req.status() == null ? "todo" : req.status();
		if (!STATUSES.contains(status)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown status");
		}
		String priority = req.priority() == null ? "mid" : req.priority();
		String description = req.description() == null ? "" : req.description();
		int position = taskRepository.countByStatus(status);
		return taskRepository.save(new Task(req.title(), description, status, priority, req.dueDate(), position));
	}
}
