import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './EmployeeManager.css';

const STORAGE_KEY = 'employees_data';
const LAST_ID_KEY = 'employees_last_id';
const SECRET_SANTA_KEY = 'secret_santa_assignments';

const EmployeeManager = () => {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ empnid: '', name: '', interests: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [lastId, setLastId] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [secretSantaAssignments, setSecretSantaAssignments] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [animationText, setAnimationText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSlotSelection, setShowSlotSelection] = useState(false);
  const [currentDrawingEmployee, setCurrentDrawingEmployee] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]); // All employees with their status
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showAssignments, setShowAssignments] = useState(false); // Toggle to show/hide assignments
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importDuplicates, setImportDuplicates] = useState([]);
  const [importValidCount, setImportValidCount] = useState(0);
  const [pendingImportEmployees, setPendingImportEmployees] = useState([]);

  // Load employees from localStorage on component mount
  useEffect(() => {
    const savedEmployees = localStorage.getItem(STORAGE_KEY);
    const savedLastId = localStorage.getItem(LAST_ID_KEY);
    
    let initialLastId = 0;
    if (savedLastId) {
      initialLastId = parseInt(savedLastId, 10) || 0;
      setLastId(initialLastId);
    }
    
    if (savedEmployees) {
      try {
        const parsedEmployees = JSON.parse(savedEmployees);
        
        // Ensure data integrity: filter out duplicates and invalid entries
        const uniqueEmployees = [];
        const seenEmpnids = new Set();
        let maxId = 0;
        
        parsedEmployees.forEach(emp => {
          if (emp && emp.id && emp.empnid && emp.name && !seenEmpnids.has(emp.empnid.toLowerCase())) {
            seenEmpnids.add(emp.empnid.toLowerCase());
            const employeeId = parseInt(emp.id, 10);
            if (employeeId > maxId) {
              maxId = employeeId;
            }
            uniqueEmployees.push({
              id: employeeId,
              empnid: emp.empnid.trim(),
              name: emp.name.trim(),
              interests: emp.interests ? emp.interests.trim() : ''
            });
          }
        });
        
        // Sort by ID to maintain order
        uniqueEmployees.sort((a, b) => a.id - b.id);
        
        setEmployees(uniqueEmployees);
        
        // Update lastId if needed
        if (maxId > initialLastId) {
          setLastId(maxId);
          localStorage.setItem(LAST_ID_KEY, maxId.toString());
        }
        
        // Update localStorage with cleaned data if duplicates were found
        if (uniqueEmployees.length !== parsedEmployees.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueEmployees));
        }
      } catch (error) {
        console.error('Error loading employees from localStorage:', error);
      }
    }
    
    // Mark as loaded after initial data is processed
    setIsLoaded(true);
  }, []);

  // Load Secret Santa assignments from localStorage
  useEffect(() => {
    const savedAssignments = localStorage.getItem(SECRET_SANTA_KEY);
    if (savedAssignments) {
      try {
        const parsedAssignments = JSON.parse(savedAssignments);
        setSecretSantaAssignments(parsedAssignments);
      } catch (error) {
        console.error('Error loading Secret Santa assignments:', error);
      }
    }
  }, []);

  // Save Secret Santa assignments to localStorage (save even if empty to clear data)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(SECRET_SANTA_KEY, JSON.stringify(secretSantaAssignments));
    }
  }, [secretSantaAssignments, isLoaded]);

  // Save employees to localStorage whenever employees array changes (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    }
  }, [employees, isLoaded]);

  // Save lastId to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (isLoaded && lastId >= 0) {
      localStorage.setItem(LAST_ID_KEY, lastId.toString());
    }
  }, [lastId, isLoaded]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Validate form
  const validateForm = () => {
    const trimmedEmpnid = formData.empnid.trim();
    const trimmedName = formData.name.trim();

    // Validate Employee ID (empnid)
    if (!trimmedEmpnid) {
      setError('Employee ID is required');
      return false;
    }

    // Validate Employee Name
    if (!trimmedName) {
      setError('Employee Name is required');
      return false;
    }

    // Check for unique Employee ID (empnid)
    if (editingId === null) {
      // Creating new employee - check if empnid already exists
      const empnidExists = employees.some(emp => emp.empnid.toLowerCase() === trimmedEmpnid.toLowerCase());
      if (empnidExists) {
        setError('Employee ID already exists. Please use a unique ID.');
        return false;
      }
    } else {
      // Updating existing employee - check if new empnid conflicts with other employees
      const empnidExists = employees.some(emp => 
        emp.empnid.toLowerCase() === trimmedEmpnid.toLowerCase() && emp.id !== editingId
      );
      if (empnidExists) {
        setError('Employee ID already exists. Please use a unique ID.');
        return false;
      }
    }

    return true;
  };

  // Create new employee
  const handleCreate = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Generate next sequential ID
    const nextId = lastId + 1;
    const newEmployee = {
      id: nextId,
      empnid: formData.empnid.trim(),
      name: formData.name.trim(),
      interests: formData.interests ? formData.interests.trim() : ''
    };

    // Double-check uniqueness before adding (case-insensitive)
    const empnidExists = employees.some(emp => 
      emp.empnid.toLowerCase() === newEmployee.empnid.toLowerCase()
    );
    
    if (empnidExists) {
      setError('Employee ID already exists. Please use a unique ID.');
      return;
    }

    setLastId(nextId);
    setEmployees(prev => [...prev, newEmployee]);
    setFormData({ empnid: '', name: '', interests: '' });
    setError('');
  };

  // Update existing employee
  const handleUpdate = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Find the employee being edited to preserve the auto-generated ID
    const employeeToUpdate = employees.find(emp => emp.id === editingId);
    if (!employeeToUpdate) {
      setError('Employee not found');
      return;
    }

    const updatedEmployee = {
      id: employeeToUpdate.id, // Keep the original auto-generated ID
      empnid: formData.empnid.trim(),
      name: formData.name.trim(),
      interests: formData.interests ? formData.interests.trim() : ''
    };

    // Double-check uniqueness before updating (case-insensitive)
    const empnidExists = employees.some(emp => 
      emp.empnid.toLowerCase() === updatedEmployee.empnid.toLowerCase() && 
      emp.id !== editingId
    );
    
    if (empnidExists) {
      setError('Employee ID already exists. Please use a unique ID.');
      return;
    }

    setEmployees(prev =>
      prev.map(emp =>
        emp.id === editingId
          ? updatedEmployee
          : emp
      )
    );

    setFormData({ empnid: '', name: '', interests: '' });
    setEditingId(null);
    setError('');
  };

  // Delete employee
  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      
      // Remove Secret Santa assignments related to this employee
      setSecretSantaAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[id];
        
        // Also remove assignments where this employee was assigned to someone
        Object.keys(newAssignments).forEach(empId => {
          if (newAssignments[empId] === id) {
            delete newAssignments[empId];
          }
        });
        
        return newAssignments;
      });
      
      if (editingId === id) {
        setFormData({ empnid: '', name: '', interests: '' });
        setEditingId(null);
      }
    }
  };

  // Edit employee
  const handleEdit = (employee) => {
    setFormData({ 
      empnid: employee.empnid, 
      name: employee.name,
      interests: employee.interests || ''
    });
    setEditingId(employee.id);
    setError('');
  };

  // Cancel edit
  const handleCancel = () => {
    setFormData({ empnid: '', name: '', interests: '' });
    setEditingId(null);
    setError('');
  };

  // Generate 100 sample employees
  const handleGenerate100Employees = () => {
    if (window.confirm('This will add 100 sample employees. Continue?')) {
      const sampleNames = [
        'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh',
        'Anjali Mehta', 'Rahul Gupta', 'Kavita Desai', 'Suresh Iyer', 'Meera Joshi',
        'Arjun Nair', 'Divya Menon', 'Kiran Rao', 'Pooja Shah', 'Manoj Verma',
        'Swati Agarwal', 'Nikhil Malhotra', 'Ritu Kapoor', 'Deepak Chawla', 'Shilpa Jain',
        'Ravi Thakur', 'Neha Bansal', 'Sandeep Khanna', 'Anita Chopra', 'Vivek Dutta',
        'Kavya Srinivasan', 'Rohit Agarwal', 'Sunita Reddy', 'Gaurav Mishra', 'Lakshmi Nair',
        'Pankaj Singh', 'Radha Iyer', 'Harsh Shah', 'Sarika Deshmukh', 'Yash Mehta',
        'Ananya Krishnan', 'Karan Malhotra', 'Jyoti Sharma', 'Tarun Patel', 'Sonia Gupta',
        'Aditya Joshi', 'Preeti Rao', 'Varun Kumar', 'Madhuri Nair', 'Abhishek Reddy',
        'Shruti Iyer', 'Rishabh Agarwal', 'Deepika Menon', 'Siddharth Shah', 'Aishwarya Rao',
        'Kunal Verma', 'Nisha Kapoor', 'Akash Chawla', 'Tanvi Jain', 'Mohit Thakur',
        'Isha Bansal', 'Rohan Khanna', 'Pallavi Chopra', 'Dev Dutta', 'Anushka Srinivasan',
        'Sahil Agarwal', 'Riya Reddy', 'Kartik Mishra', 'Snehal Nair', 'Jayesh Iyer',
        'Trisha Mehta', 'Dhruv Krishnan', 'Ishita Malhotra', 'Arnav Sharma', 'Maya Patel',
        'Vedant Gupta', 'Zara Joshi', 'Reyansh Rao', 'Avni Kumar', 'Aarav Reddy',
        'Kiara Iyer', 'Aryan Agarwal', 'Anika Menon', 'Vihaan Shah', 'Saanvi Rao',
        'Advik Verma', 'Aadhya Kapoor', 'Arhaan Chawla', 'Anvi Jain', 'Ayaan Thakur',
        'Ira Bansal', 'Ahaan Khanna', 'Myra Chopra', 'Aarush Dutta', 'Aaradhya Srinivasan',
        'Vivaan Agarwal', 'Anaya Reddy', 'Atharv Mishra', 'Avyaan Nair', 'Akshara Iyer',
        'Reyaan Mehta', 'Aariz Krishnan', 'Aarohi Malhotra', 'Arin Sharma', 'Aryahi Patel',
        'Ahaan Gupta', 'Aaradhya Joshi', 'Ayaansh Rao', 'Avishi Kumar', 'Aaravya Reddy'
      ];

      const existingEmpnids = new Set(employees.map(emp => emp.empnid.toLowerCase()));
      const newEmployees = [];
      let currentLastId = lastId;

      for (let i = 0; i < 100; i++) {
        const name = sampleNames[i] || `Employee ${i + 1}`;
        // Generate employee ID: EMP001, EMP002, etc.
        let empnid = `EMP${String(i + 1).padStart(3, '0')}`;
        
        // If employee ID already exists, try alternative format
        let counter = 1;
        while (existingEmpnids.has(empnid.toLowerCase()) || 
               newEmployees.some(emp => emp.empnid.toLowerCase() === empnid.toLowerCase())) {
          empnid = `EMP${String(i + 1).padStart(3, '0')}-${counter}`;
          counter++;
        }

        currentLastId++;
        newEmployees.push({
          id: currentLastId,
          empnid: empnid,
          name: name,
          interests: '' // Optional field, can be added later
        });
      }

      setLastId(currentLastId);
      setEmployees(prev => [...prev, ...newEmployees]);
      setError('');
    }
  };

  // Handle Excel import
  const handleExcelImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          setError('Excel file must have at least a header row and one data row.');
          event.target.value = ''; // Reset file input
          return;
        }

        // Get header row (first row)
        const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
        
        // Find column indices
        const sNoIndex = headers.findIndex(h => h.includes('s.no') || h.includes('sno') || h.includes('serial'));
        const empIdIndex = headers.findIndex(h => h.includes('employee_id') || h.includes('employee id') || h.includes('empnid') || h.includes('emp id'));
        const empNameIndex = headers.findIndex(h => h.includes('employee_name') || h.includes('employee name') || h.includes('name'));
        const interestsIndex = headers.findIndex(h => h.includes('interests') || h.includes('hobbies') || h.includes('interest'));

        if (empIdIndex === -1 || empNameIndex === -1) {
          setError('Excel file must contain "Employee_ID" and "Employee_Name" columns.');
          event.target.value = '';
          return;
        }

        // Process data rows
        const existingEmpnids = new Set(employees.map(emp => emp.empnid.toLowerCase()));
        const newEmployees = [];
        const duplicates = [];
        const seenInFile = new Map(); // Track duplicate Employee IDs within the file
        let currentLastId = lastId;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue; // Skip empty rows

          const empnid = row[empIdIndex] ? String(row[empIdIndex]).trim() : '';
          const name = row[empNameIndex] ? String(row[empNameIndex]).trim() : '';
          const interests = interestsIndex !== -1 && row[interestsIndex] ? String(row[interestsIndex]).trim() : '';

          // Skip if required fields are empty
          if (!empnid || !name) continue;

          const empnidLower = empnid.toLowerCase();

          // Only check for duplicate Employee IDs (not names)
          // Check for duplicates within the file
          if (seenInFile.has(empnidLower)) {
            duplicates.push({
              row: i + 1,
              empnid: empnid,
              name: name,
              reason: 'Duplicate Employee ID in Excel file'
            });
            continue;
          }

          // Check for duplicates with existing employees (by Employee ID only)
          if (existingEmpnids.has(empnidLower)) {
            duplicates.push({
              row: i + 1,
              empnid: empnid,
              name: name,
              reason: 'Employee ID already exists in system'
            });
            continue;
          }

          // Valid employee (same name is allowed, only Employee ID must be unique)
          seenInFile.set(empnidLower, true);
          currentLastId++;
          newEmployees.push({
            id: currentLastId,
            empnid: empnid,
            name: name,
            interests: interests || ''
          });
        }

        if (duplicates.length > 0) {
          // Show popup with duplicates, store valid employees for later
          setImportDuplicates(duplicates);
          setImportValidCount(newEmployees.length);
          setPendingImportEmployees(newEmployees);
          setLastId(currentLastId); // Update lastId for the valid employees
          setShowImportPopup(true);
        } else {
          // No duplicates, add directly
          if (newEmployees.length > 0) {
            setLastId(currentLastId);
            setEmployees(prev => [...prev, ...newEmployees]);
            setError('');
            alert(`Successfully imported ${newEmployees.length} employee(s)!`);
          } else {
            setError('No valid employees found in the Excel file.');
          }
        }

        event.target.value = ''; // Reset file input
      } catch (error) {
        console.error('Error reading Excel file:', error);
        setError('Error reading Excel file. Please ensure it is a valid Excel file.');
        event.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle import confirmation (add valid employees even if duplicates exist)
  const handleImportConfirm = () => {
    if (pendingImportEmployees.length > 0) {
      setEmployees(prev => [...prev, ...pendingImportEmployees]);
      setError('');
      alert(`Successfully imported ${pendingImportEmployees.length} employee(s)!`);
    }
    setShowImportPopup(false);
    setImportDuplicates([]);
    setImportValidCount(0);
    setPendingImportEmployees([]);
  };

  // Secret Santa draw function - assigns unique employees to each other (with animation)
  const handleSecretSantaDraw = () => {
    if (employees.length < 2) {
      setError('Need at least 2 employees for Secret Santa!');
      return;
    }

    setIsAnimating(true);
    setError('');
    
    // Animation text rotation
    const animationTexts = ['🎅 Drawing...', '🎄 Shuffling...', '🎁 Assigning...', '✨ Almost there...'];
    let textIndex = 0;
    const textInterval = setInterval(() => {
      setAnimationText(animationTexts[textIndex % animationTexts.length]);
      textIndex++;
    }, 500);

    // After 2 seconds, perform the actual assignment
    setTimeout(() => {
      clearInterval(textInterval);
      
      // Create a valid Secret Santa assignment
      const shuffled = [...employees];

      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Assign each employee to another (ensuring no self-assignment)
      let attempts = 0;
      const maxAttempts = 100;
      let finalAssignments = {};

      while (attempts < maxAttempts) {
        const tempAssignments = {};
        let valid = true;

        for (let i = 0; i < employees.length; i++) {
          let assignedIndex = i;
          let retries = 0;

          // Find a valid assignment (not self)
          while (employees[i].id === shuffled[assignedIndex].id && retries < employees.length) {
            assignedIndex = (assignedIndex + 1) % employees.length;
            retries++;
          }

          if (employees[i].id === shuffled[assignedIndex].id) {
            valid = false;
            break;
          }

          tempAssignments[employees[i].id] = shuffled[assignedIndex].id;
        }

        if (valid) {
          finalAssignments = tempAssignments;
          break;
        }

        // Reshuffle and try again
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        attempts++;
      }

      if (Object.keys(finalAssignments).length === 0) {
        setError('Unable to create valid Secret Santa assignments. Please try again.');
        setIsAnimating(false);
        setAnimationText('');
        return;
      }

      setSecretSantaAssignments(finalAssignments);
      setIsAnimating(false);
      setAnimationText('');
      
      // Show popup with all assignments
      const assignmentsList = Object.keys(finalAssignments).map(empId => {
        const emp = employees.find(e => e.id === parseInt(empId));
        const assigned = employees.find(e => e.id === finalAssignments[empId]);
        return { employee: emp, assigned: assigned };
      });
      
      setPopupData({
        type: 'all',
        title: '🎅 Secret Santa Assignments Complete!',
        assignments: assignmentsList
      });
    }, 2000);
  };

  // Individual Secret Santa draw for a single employee
  const handleIndividualDraw = (employeeId) => {
    // Get employees who are already assigned to someone else (to prevent duplicate assignments)
    const assignedIds = new Set(Object.values(secretSantaAssignments));
    
    // Get available employees who:
    // 1. Are not the current employee
    // 2. Are not already assigned to someone else (to prevent same person assigned to multiple people)
    const availableEmployees = employees.filter(emp => 
      emp.id !== employeeId && 
      !assignedIds.has(emp.id)
    );

    if (availableEmployees.length === 0) {
      setError('No available employees to assign! All employees may already be assigned.');
      return;
    }

    // Create a list of all employees with their status for display
    const employee = employees.find(e => e.id === employeeId);
    const allEmployeesWithStatus = employees.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, status: 'own' }; // Current employee's own chit
      } else if (assignedIds.has(emp.id)) {
        return { ...emp, status: 'assigned' }; // Already assigned to someone else
      } else {
        return { ...emp, status: 'available' }; // Available to select
      }
    });

    // Show slot selection UI
    setCurrentDrawingEmployee(employee);
    setAvailableSlots(availableEmployees);
    setAllSlots(allEmployeesWithStatus);
    setSelectedSlot(null);
    setShowSlotSelection(true);
    setError('');
  };

  // Handle slot selection - randomly assign from available pool
  const handleSlotSelect = (slotIndex) => {
    if (selectedSlot !== null) return; // Prevent multiple selections
    
    setSelectedSlot(slotIndex);
    
    // Randomly select from available employees
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    const assignedEmployee = availableSlots[randomIndex];
    
    // Add animation delay for better UX
    setTimeout(() => {
      setSecretSantaAssignments(prev => ({
        ...prev,
        [currentDrawingEmployee.id]: assignedEmployee.id
      }));
      
      setShowSlotSelection(false);
      setCurrentDrawingEmployee(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      
      // Show popup with assignment
      setPopupData({
        type: 'individual',
        title: '🎁 Secret Santa Assigned!',
        employee: currentDrawingEmployee,
        assigned: assignedEmployee
      });
    }, 800);
  };

  // Close slot selection
  const handleCloseSlotSelection = () => {
    setShowSlotSelection(false);
    setCurrentDrawingEmployee(null);
    setAvailableSlots([]);
    setAllSlots([]);
    setSelectedSlot(null);
  };

  // Get Secret Santa assignment for a specific employee
  const getSecretSantaAssignment = (employeeId) => {
    const assignedId = secretSantaAssignments[employeeId];
    if (assignedId) {
      const assignedEmployee = employees.find(emp => emp.id === assignedId);
      return assignedEmployee;
    }
    return null;
  };

  // Clear all Secret Santa assignments
  const handleClearSecretSanta = () => {
    if (window.confirm('Are you sure you want to clear all Secret Santa assignments?')) {
      setSecretSantaAssignments({});
      // localStorage will be updated by the useEffect hook
      setPopupData(null);
    }
  };

  // Close popup
  const handleClosePopup = () => {
    setPopupData(null);
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter(employee => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase().trim();
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.empnid.toLowerCase().includes(query) ||
      employee.id.toString().includes(query) ||
      (employee.interests && employee.interests.toLowerCase().includes(query))
    );
  });

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="employee-manager">
      {/* Animation Overlay */}
      {isAnimating && (
        <div className="animation-overlay">
          <div className="animation-content">
            <div className="spinner"></div>
            <p className="animation-text">{animationText}</p>
          </div>
        </div>
      )}

      {/* Slot Selection Overlay */}
      {showSlotSelection && currentDrawingEmployee && (
        <div className="slot-selection-overlay" onClick={handleCloseSlotSelection}>
          <div className="slot-selection-content" onClick={(e) => e.stopPropagation()}>
            <button className="slot-close-btn" onClick={handleCloseSlotSelection}>×</button>
            <div className="slot-selection-header">
              <h2>🎲 Pick Your Secret Santa</h2>
              <p className="slot-selection-subtitle">
                <strong>{currentDrawingEmployee.name}</strong>, select a chit from the available slots below
              </p>
            </div>
            
            <div className="slots-container">
              <div className="slots-legend">
                <div className="legend-item">
                  <div className="legend-box available"></div>
                  <span>Available</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box selected"></div>
                  <span>Selected</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box assigned"></div>
                  <span>Already Assigned</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box own"></div>
                  <span>Your Own</span>
                </div>
              </div>
              <div className="slots-grid">
                {allSlots.map((slot, index) => {
                  const availableIndex = availableSlots.findIndex(emp => emp.id === slot.id);
                  const isSelected = selectedSlot !== null && selectedSlot === availableIndex && slot.status === 'available';
                  const isAvailable = slot.status === 'available';
                  const isAssigned = slot.status === 'assigned';
                  const isOwn = slot.status === 'own';
                  
                  return (
                    <div
                      key={slot.id}
                      className={`slot-card ${isSelected ? 'selected' : slot.status}`}
                      onClick={() => isAvailable && !isSelected && handleSlotSelect(availableIndex)}
                      title={isOwn ? 'Your Own Chit' : isAssigned ? 'Already Assigned' : 'Available Chit'}
                    >
                      <div className="slot-icon">
                        {isSelected ? '🎁' : isOwn ? '👤' : isAssigned ? '🔒' : '🎲'}
                      </div>
                      {isOwn && (
                        <div className="slot-own-indicator">
                          <span>Your Own</span>
                        </div>
                      )}
                      {isAssigned && (
                        <div className="slot-assigned-indicator">
                          <span>Assigned</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="slot-selected-indicator">
                          <span>✓ Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="slot-selection-footer">
              <p className="slots-available-info">
                {selectedSlot === null 
                  ? `${availableSlots.length} ${availableSlots.length === 1 ? 'chit' : 'chits'} available out of ${allSlots.length} total - Pick one!`
                  : 'Assigning your Secret Santa...'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Duplicates Popup */}
      {showImportPopup && (
        <div className="popup-overlay" onClick={handleImportConfirm}>
          <div className="popup-content import-popup" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={handleImportConfirm}>×</button>
            <h2>⚠️ Duplicate Employee IDs Found</h2>
            <div className="import-summary">
              <p className="import-summary-text">
                <strong>{importValidCount}</strong> valid employee(s) will be imported.
                <br />
                <strong>{importDuplicates.length}</strong> duplicate(s) found and will be skipped.
              </p>
            </div>
            <div className="duplicates-list-container">
              <h3>Duplicate Employee IDs:</h3>
              <div className="duplicates-table-wrapper">
                <table className="duplicates-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importDuplicates.map((dup, index) => (
                      <tr key={index}>
                        <td>{dup.row}</td>
                        <td>{dup.empnid}</td>
                        <td>{dup.name}</td>
                        <td className="duplicate-reason">{dup.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="popup-actions">
              <button className="btn btn-primary" onClick={handleImportConfirm}>
                OK - Import Valid Employees
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Modal */}
      {popupData && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={handleClosePopup}>×</button>
            <h2>{popupData.title}</h2>
            {popupData.type === 'all' ? (
              <div className="popup-assignments">
                {popupData.assignments.map((item, index) => (
                  <div key={index} className="assignment-item">
                    <div className="assignment-employee">
                      <strong>{item.employee.name}</strong> ({item.employee.empnid})
                    </div>
                    <div className="assignment-arrow">→</div>
                    <div className="assignment-assigned">
                      <strong>{item.assigned.name}</strong> ({item.assigned.empnid})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="popup-single-assignment">
                <div className="assignment-employee">
                  <p><strong>{popupData.employee.name}</strong></p>
                  <p className="employee-id">ID: {popupData.employee.empnid}</p>
                </div>
                <div className="assignment-arrow-large">🎁</div>
                <div className="assignment-assigned">
                  <p><strong>{popupData.assigned.name}</strong></p>
                  <p className="employee-id">ID: {popupData.assigned.empnid}</p>
                </div>
              </div>
            )}
            <button className="btn btn-primary popup-ok-btn" onClick={handleClosePopup}>
              OK
            </button>
          </div>
        </div>
      )}

      <h1>Employee Management System</h1>
      
      <div className="employee-form-container">
        <h2>{editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="employee-form">
          <div className="form-group">
            <label htmlFor="empnid">Employee ID (EmpnID):</label>
            <input
              type="text"
              id="empnid"
              name="empnid"
              value={formData.empnid}
              onChange={handleChange}
              placeholder="Enter employee ID"
              disabled={editingId !== null}
              className={editingId !== null ? 'disabled' : ''}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Employee Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="interests">Interests & Hobbies (Optional):</label>
            <textarea
              id="interests"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              placeholder="Enter interests and hobbies (e.g., Reading, Music, Sports)"
              rows="3"
              className="form-textarea"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Employee' : 'Add Employee'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="employee-list-container">
        <div className="employee-list-header">
          <div className="employee-list-title-section">
            <h2>Employee List ({employees.length})</h2>
            <div className="header-buttons-group">
              <label htmlFor="excel-import" className="btn btn-import">
                📥 Import Excel
                <input
                  type="file"
                  id="excel-import"
                  accept=".xlsx,.xls"
                  onChange={handleExcelImport}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={handleGenerate100Employees}
                className="btn btn-generate"
                title="Add 100 sample employees"
              >
                ➕ Generate 100 Employees
              </button>
            </div>
          </div>
          {employees.length >= 2 && (
            <div className="secret-santa-controls">
              <button
                onClick={handleSecretSantaDraw}
                className="btn btn-secret-santa"
                disabled={isAnimating}
              >
                🎅 Draw All Secret Santa
              </button>
              {Object.keys(secretSantaAssignments).length > 0 && (
                <>
                  <button
                    onClick={() => setShowAssignments(!showAssignments)}
                    className="btn btn-toggle"
                  >
                    {showAssignments ? '🙈 Hide Assignments' : '👁️ Show Assignments'}
                  </button>
                  <button
                    onClick={handleClearSecretSanta}
                    className="btn btn-clear"
                  >
                    Clear Assignments
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        {employees.length > 0 && (
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, employee ID, ID, or interests..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="search-results-info">
                Found {filteredEmployees.length} of {employees.length} employees
              </div>
            )}
          </div>
        )}

        {employees.length === 0 ? (
          <div className="empty-state">
            <p>No employees found. Add your first employee above!</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="employee-table desktop-view">
              {filteredEmployees.length === 0 && searchQuery ? (
                <div className="no-search-results-table">
                  <p>🔍 No employees found matching "{searchQuery}"</p>
                  <button
                    onClick={handleClearSearch}
                    className="btn btn-secondary"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Interests & Hobbies</th>
                      <th>Secret Santa</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(employee => {
                    const assignedEmployee = getSecretSantaAssignment(employee.id);
                    return (
                      <tr key={employee.id}>
                        <td>{employee.id}</td>
                        <td>{employee.empnid}</td>
                        <td>{employee.name}</td>
                        <td className="interests-cell">
                          {employee.interests ? (
                            <span className="interests-text" title={employee.interests}>
                              {employee.interests.length > 50 
                                ? `${employee.interests.substring(0, 50)}...` 
                                : employee.interests}
                            </span>
                          ) : (
                            <span className="no-interests">-</span>
                          )}
                        </td>
                        <td className="secret-santa-cell">
                          {assignedEmployee ? (
                            showAssignments ? (
                              <span className="assigned-name">
                                🎁 {assignedEmployee.name} ({assignedEmployee.empnid})
                              </span>
                            ) : (
                              <span className="assigned-hidden">
                                🎁 [Hidden - Click "Show Assignments" to reveal]
                              </span>
                            )
                          ) : (
                            <div className="not-assigned-container">
                              <span className="not-assigned">Not assigned</span>
                              {employees.length >= 2 && (
                                <button
                                  onClick={() => handleIndividualDraw(employee.id)}
                                  className="btn btn-draw-individual"
                                  disabled={isAnimating}
                                >
                                  🎲 Draw
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleEdit(employee)}
                            className="btn btn-edit"
                            disabled={isAnimating}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="btn btn-delete"
                            disabled={isAnimating}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="employee-cards mobile-view">
              {filteredEmployees.length === 0 && searchQuery ? (
                <div className="no-search-results">
                  <p>🔍 No employees found matching "{searchQuery}"</p>
                  <button
                    onClick={handleClearSearch}
                    className="btn btn-secondary"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredEmployees.map(employee => {
                const assignedEmployee = getSecretSantaAssignment(employee.id);
                return (
                  <div key={employee.id} className="employee-card">
                    <div className="card-header">
                      <div className="employee-badge">#{employee.id}</div>
                      <h3 className="employee-name">{employee.name}</h3>
                    </div>
                    <div className="card-body">
                      <div className="card-info-row">
                        <span className="info-label">Employee ID:</span>
                        <span className="info-value">{employee.empnid}</span>
                      </div>
                      {employee.interests && (
                        <div className="card-info-row">
                          <span className="info-label">Interests & Hobbies:</span>
                          <span className="info-value interests-text-mobile">{employee.interests}</span>
                        </div>
                      )}
                      <div className="card-info-row secret-santa-info">
                        <span className="info-label">Secret Santa:</span>
                        <div className="info-value">
                          {assignedEmployee ? (
                            showAssignments ? (
                              <span className="assigned-name-mobile">
                                🎁 {assignedEmployee.name}
                                <span className="assigned-id">({assignedEmployee.empnid})</span>
                              </span>
                            ) : (
                              <span className="assigned-hidden-mobile">
                                🎁 [Hidden - Click "Show Assignments" to reveal]
                              </span>
                            )
                          ) : (
                            <div className="not-assigned-mobile">
                              <span className="not-assigned-text">Not assigned</span>
                              {employees.length >= 2 && (
                                <button
                                  onClick={() => handleIndividualDraw(employee.id)}
                                  className="btn btn-draw-individual-mobile"
                                  disabled={isAnimating}
                                >
                                  🎲 Draw Now
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="btn btn-edit-mobile"
                        disabled={isAnimating}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="btn btn-delete-mobile"
                        disabled={isAnimating}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeManager;

