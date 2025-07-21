const express = require('express');
const Task = require('../models/Task');
const ActionLog = require('../models/ActionLog');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = (io) => {
  const router = express.Router();

  router.get('/', authMiddleware, async (req, res) => {
    try {
      const tasks = await Task.find().populate('assignedUser', 'username');
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const task = new Task({ ...req.body, createdBy: req.userId });
      await task.save();
      const user = await User.findById(req.userId);
      if (!user) throw new Error('User not found');
      const log = new ActionLog({
        action: `Created task: ${task.title} by ${user.username}`,
        user: req.userId,
        task: task._id,
      });
      await log.save();
      io.emit('actionLogged', log);
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      if (task.version !== req.body.version) {
        return res.status(409).json({ message: 'Conflict detected', currentVersion: task, clientVersion: req.body });
      }
      task.title = req.body.title;
      task.description = req.body.description;
      task.priority = req.body.priority;
      task.status = req.body.status;
      task.lastModified = Date.now();
      task.version += 1;
      await task.save();
      const user = await User.findById(req.userId);
      if (!user) throw new Error('User not found');
      const log = new ActionLog({
        action: `Updated task: ${task.title} by ${user.username}`,
        user: req.userId,
        task: task._id,
      });
      await log.save();
      io.emit('actionLogged', log);
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      console.log('Deleting task with ID:', req.params.id);
      const task = await Task.findById(req.params.id);
      if (!task) {
        console.log('Task not found for ID:', req.params.id);
        return res.status(404).json({ message: 'Task not found' });
      }
      await task.deleteOne();
      console.log('Task deleted:', task._id);
      const user = await User.findById(req.userId);
      if (!user) {
        console.error('User not found for ID:', req.userId);
        throw new Error('User not found');
      }
      const log = new ActionLog({
        action: `Deleted task: ${task.title} by ${user.username}`,
        user: req.userId,
        task: task._id,
      });
      await log.save();
      console.log('Action log saved:', log);
      io.emit('actionLogged', log);
      res.json({ message: 'Task deleted' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  router.post('/smart-assign/:id', authMiddleware, async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const users = await User.find();
      let minTasks = Infinity;
      let assignedUser = null;

      for (const user of users) {
        const taskCount = await Task.countDocuments({
          assignedUser: user._id,
          status: { $ne: 'Done' },
        });
        if (taskCount < minTasks) {
          minTasks = taskCount;
          assignedUser = user._id;
        }
      }

      task.assignedUser = assignedUser;
      task.lastModified = Date.now();
      task.version += 1;
      await task.save();

      const assignedUserDoc = await User.findById(assignedUser);
      const user = await User.findById(req.userId);
      if (!user) throw new Error('User not found');
      const log = new ActionLog({
        action: `Smart assigned task: ${task.title} to ${assignedUserDoc ? assignedUserDoc.username : 'Unassigned'} by ${user.username}`,
        user: req.userId,
        task: task._id,
      });
      await log.save();
      io.emit('actionLogged', log);

      await task.populate('assignedUser', 'username');
      res.json(task);
    } catch (error) {
      console.error('Error smart assigning task:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};