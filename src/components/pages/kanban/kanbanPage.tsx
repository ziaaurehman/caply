"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Plus } from "lucide-react"
import KanbanColumn from "./KanbanColumn"
import AddTaskModal from "./AddTaskModal"
import { Task, Column } from "./types"

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: "todo",
      title: "To Do",
      tasks: [
        {
          id: "1",
          title: "Design Review",
          description: "Design review milestone",
          hours: 4,
          dueDate: "2/16/2025",
          assigneeName: "John Doe",
          assigneeAvatar: "",
          progress: 0,
        },
        {
          id: "2",
          title: "Integration Testing",
          description: "Test frontend and backend integration",
          hours: 40,
          dueDate: "3/25/2025",
          assigneeName: "Jane Smith",
          assigneeAvatar: "",
          progress: 0,
        },
      ],
    },
    {
      id: "in-progress",
      title: "In Progress",
      tasks: [
        {
          id: "3",
          title: "Frontend Development",
          description: "Implement frontend components and features",
          hours: 120,
          dueDate: "3/15/2025",
          assigneeName: "Alice Johnson",
          assigneeAvatar: "",
          progress: 65,
        },
        {
          id: "4",
          title: "Backend Development",
          description: "Implement backend services and APIs",
          hours: 100,
          dueDate: "3/15/2025",
          assigneeName: "Bob Williams",
          assigneeAvatar: "",
          progress: 60,
        },
      ],
    },
    {
      id: "done",
      title: "Done",
      tasks: [
        {
          id: "5",
          title: "Design Phase",
          description: "UI/UX design and prototyping",
          hours: 80,
          dueDate: "2/15/2025",
          assigneeName: "Charlie Brown",
          assigneeAvatar: "",
          progress: 100,
        },
        {
          id: "6",
          title: "ZZ",
          description: "ZZ",
          hours: 233,
          dueDate: "7/24/2025",
          assigneeName: "Diana Prince",
          assigneeAvatar: "",
          progress: 0,
        },
      ],
    },
  ])

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null)
  const [background, setBackground] = useState<string>("");
  const [backgroundType, setBackgroundType] = useState<'image' | 'color'>("image");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'colors'>("images");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // List of available backgrounds
  const backgrounds = [
    { name: "Blue", src: "/kanban/blue-preview.jpg" },
    { name: "Dark", src: "/kanban/dark-preview.jpg" },
    { name: "Landscape", src: "/kanban/landscape-preview.jpg" },
    { name: "Nature", src: "/kanban/nature-preview.jpg" },
  ];

  // List of available colors
  const colors = [
    { name: "White", value: "#ffffff" },
    { name: "Light Gray", value: "#f3f4f6" },
    { name: "Orange", value: "#ffedd5" },
    { name: "Sky Blue", value: "#e0f2fe" },
    { name: "Emerald", value: "#d1fae5" },
    { name: "Purple", value: "#ede9fe" },
    { name: "Slate", value: "#e2e8f0" },
    { name: "Dark Gray", value: "#1e293b" },
  ];

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kanbanBackground");
    const savedType = localStorage.getItem("kanbanBackgroundType");
    if (saved) setBackground(saved);
    if (savedType === "color" || savedType === "image") setBackgroundType(savedType);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (background) localStorage.setItem("kanbanBackground", background);
    localStorage.setItem("kanbanBackgroundType", backgroundType);
  }, [background, backgroundType]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("taskId", task.id)
    const columnElement = e.currentTarget.closest("[data-column-id]") as HTMLElement
    if (columnElement) {
      e.dataTransfer.setData("sourceColumnId", columnElement.dataset.columnId || "")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault() // Necessary to allow dropping
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("taskId")
    const sourceColumnId = e.dataTransfer.getData("sourceColumnId")

    if (taskId && sourceColumnId) {
      setColumns((prevColumns) => {
        let draggedTask: Task | null = null
        const newColumns = prevColumns.map((column) => {
          if (column.id === sourceColumnId) {
            const taskIndex = column.tasks.findIndex((t) => t.id === taskId)
            if (taskIndex > -1) {
              draggedTask = column.tasks[taskIndex]
              return {
                ...column,
                tasks: column.tasks.filter((t) => t.id !== taskId),
              }
            }
          }
          return column
        })

        if (draggedTask) {
          return newColumns.map((column) => {
            if (column.id === targetColumnId) {
              return {
                ...column,
                tasks: [...column.tasks, draggedTask!],
              }
            }
            return column
          })
        }
        return prevColumns
      })
    }
  }

  const handleAddTask = (columnId: string) => {
    setSelectedColumnId(columnId)
    setIsAddTaskModalOpen(true)
  }

  const handleSaveTask = (columnId: string, newTask: Task) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) => (column.id === columnId ? { ...column, tasks: [...column.tasks, newTask] } : column)),
    )
  }

  const handleAddColumn = () => {
    const newColumnTitle = prompt("Enter new list title:")
    if (newColumnTitle) {
      const newColumnId = newColumnTitle.toLowerCase().replace(/\s/g, "-")
      setColumns((prevColumns) => [...prevColumns, { id: newColumnId, title: newColumnTitle, tasks: [] }])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="max-w-full mx-auto">
       <div className="p-4"> {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Project Management</h1>
            <p className="text-sm text-gray-500">Manage tasks with Kanban board</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <select className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                <option>Website Redesign</option>
                <option>Mobile App Development</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            <div className="relative">
              <select className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                <option>All Assignees</option>
                <option>John Doe</option>
                <option>Jane Smith</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            {/* Kanban Background Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <span className="mr-2">Board Background</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-0">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      className={`flex-1 py-2 text-sm font-medium rounded-tl-lg focus:outline-none transition-colors duration-150 ${activeTab === 'images' ? 'bg-orange-50 text-orange-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      onClick={() => setActiveTab('images')}
                    >
                      Images
                    </button>
                    <button
                      className={`flex-1 py-2 text-sm font-medium rounded-tr-lg focus:outline-none transition-colors duration-150 ${activeTab === 'colors' ? 'bg-orange-50 text-orange-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      onClick={() => setActiveTab('colors')}
                    >
                      Colors
                    </button>
                  </div>
                  {/* Tab Content */}
                  <div className="p-4">
                    {activeTab === 'images' && (
                      <div className="grid grid-cols-2 gap-4">
                        {backgrounds.map((bg) => (
                          <button
                            key={bg.src}
                            className={`group relative rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none ${backgroundType === 'image' && background === bg.src ? "border-orange-500 ring-2 ring-orange-200" : "border-transparent"}`}
                            onClick={() => {
                              setBackground(bg.src);
                              setBackgroundType('image');
                              setDropdownOpen(false);
                            }}
                          >
                            <img
                              src={bg.src}
                              alt={bg.name}
                              className="w-full h-24 object-cover group-hover:opacity-80 transition-opacity"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 text-center">{bg.name}</span>
                            {backgroundType === 'image' && background === bg.src && (
                              <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow">Selected</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {activeTab === 'colors' && (
                      <div className="grid grid-cols-4 gap-4">
                        {colors.map((color) => (
                          <button
                            key={color.value}
                            className={`relative w-14 h-14 rounded-lg border-2 transition-all duration-200 focus:outline-none ${backgroundType === 'color' && background === color.value ? "border-orange-500 ring-2 ring-orange-200" : "border-transparent"}`}
                            style={{ background: color.value }}
                            title={color.name}
                            onClick={() => {
                              setBackground(color.value);
                              setBackgroundType('color');
                              setDropdownOpen(false);
                            }}
                          >
                            {backgroundType === 'color' && background === color.value && (
                              <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow">Selected</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
          </div>
        </div>
        </div>
        {/* Kanban Board */}
        <div
          className="relative py-12 rounded-lg"
          style={
            backgroundType === 'image' && background
              ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : backgroundType === 'color' && background
              ? { background: background }
              : {}
          }
        >
          {/* Mirror blur background for horizontal scroll */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-300 via-gray-200 to-gray-10 backdrop-blur-lg py-12" style={{ opacity: background ? 0.7 : 1 }}></div>
          <div className="flex overflow-x-auto pb-4 gap-6 px-4 relative z-10 min-h-[500px] items-start">
            {columns.map((column) => (
              <div key={column.id} data-column-id={column.id} className="flex-shrink-0">
                <KanbanColumn
                  column={column}
                  tasks={column.tasks}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onAddTask={handleAddTask}
                />
              </div>
            ))}
            {/* Add another list button */}
            <button
              onClick={handleAddColumn}
              className="flex-shrink-0 w-80 bg-gray-200 rounded-lg p-4 flex items-center justify-center text-gray-700 hover:bg-gray-300 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add another list
            </button>
          </div>
        </div>
      </div>
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onSave={handleSaveTask}
        columnId={selectedColumnId}
      />
    </div>
  )
}
