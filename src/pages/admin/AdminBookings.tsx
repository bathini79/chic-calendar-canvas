
import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { supabase } from "@/integrations/supabase/client";

// A simple calendar icon (SVG)
function CalendarIcon(props) {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-8 4h8m-8 4h8m-8 4h8m-8 4h8M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
      />
    </svg>
  );
}

// Simple arrow icons for date navigation
function ArrowLeftIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ---- Configuration ----
const ItemTypes = { EVENT: "event" };
const START_HOUR = 8; // 8:00 AM
const END_HOUR = 20; // 8:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const PIXELS_PER_HOUR = 60;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

// Format a fractional hour as "h:mmam/pm"
function formatTime(time) {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  const period = hours >= 12 ? "pm" : "am";
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")}${period}`;
}

// For the left column: integer hours only (8..19) => 12 hours
const hourLabels = Array.from({ length: 12 }, (_, i) => i + START_HOUR);

// Sample events
const initialEvents = [
  { id: 1, employeeId: 1, title: "Haircut", startHour: 9, duration: 1 },
  { id: 2, employeeId: 2, title: "Facial", startHour: 9.5, duration: 1.5 },
  { id: 3, employeeId: 3, title: "Manicure", startHour: 13, duration: 1 },
];

// Example stats
const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value:
 1950 },
];

// Draggable & Resizable Event
function CalendarEvent({ event, onEventUpdate }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.EVENT,
    item: { eventId: event.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const minuteDelta = delta.y / PIXELS_PER_MINUTE;
        let hourDelta = minuteDelta / 60;
        let newStart = event.startHour + hourDelta;
        // Snap to 15 minutes
        newStart = Math.round(newStart * 4) / 4;
        // Clamp
        const maxStart = END_HOUR - event.duration;
        newStart = Math.max(START_HOUR, Math.min(newStart, maxStart));
        onEventUpdate(event.id, { startHour: newStart });
      }
    },
  });

  const topPos = (event.startHour - START_HOUR) * PIXELS_PER_HOUR;
  const eventHeight = event.duration * PIXELS_PER_HOUR;

  const onResizeStop = (e, data) => {
    const newHeight = data.size.height;
    let newDuration = newHeight / PIXELS_PER_HOUR;
    // Snap to 15 minutes
    newDuration = Math.round(newDuration * 4) / 4;
    const maxDuration = END_HOUR - event.startHour;
    newDuration = Math.min(newDuration, maxDuration);
    onEventUpdate(event.id, { duration: newDuration });
  };

  return (
    <div
      ref={dragRef}
      className="absolute left-2 right-2"
      style={{
        top: topPos,
        height: eventHeight,
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
        zIndex: 2,
      }}
    >
      <ResizableBox
        width={Infinity}
        height={eventHeight}
        axis="y"
        minConstraints={[0, 15]}
        onResizeStop={onResizeStop}
        resizeHandles={["s"]}
      >
        <div className="bg-blue-500 text-white text-xs rounded flex items-center justify-center h-full select-none">
          {event.title}
        </div>
      </ResizableBox>
    </div>
  );
}

// Main Component
export default function DefineSalonView() {
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState(initialEvents);
  const [stats] = useState(initialStats);

  // Example date in state
  const [currentDate, setCurrentDate] = useState(new Date(2025, 1, 11)); // 11 Feb 2025

  // "Now" line
  const [nowPosition, setNowPosition] = useState(null);
  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        setNowPosition((currentHour - START_HOUR) * PIXELS_PER_HOUR);
      } else {
        setNowPosition(null);
      }
    };
    updateNow();
    const intervalId = setInterval(updateNow, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase.from("employees").select("*");
        if (error) throw error;
        const employeeWithAvatar = data.map((employee) => ({
          ...employee,
          avatar: employee.name
            .split(" ")
            .map((n) => n[0])
            .join(""),
        }));
        setEmployees(employeeWithAvatar);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, []);

  // Format the displayed date as "Tue 11 Feb"
  function formatCurrentDate(date) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = months[date.getMonth()];
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
  }

  // Nav: go to "Today"
  function goToday() {
    setCurrentDate(new Date());
  }
  // Nav: previous day
  function goPrev() {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  }
  // Nav: next day
  function goNext() {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  }

  // Update an event (drag or resize)
  const handleEventUpdate = (eventId, changes) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, ...changes } : ev))
    );
  };

  // Hover tooltip
  const [hoverCell, setHoverCell] = useState(null);

  // Click popup
  const [clickedCell, setClickedCell] = useState(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);

  // Mouse move in an employee column
  function handleMouseMove(e, empId) {
    if (e.target !== e.currentTarget) {
      setHoverCell(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let hoveredTime = START_HOUR + offsetY / PIXELS_PER_HOUR;
    hoveredTime = Math.round(hoveredTime * 4) / 4;

    setHoverCell({
      employeeId: empId,
      time: hoveredTime,
      x: e.pageX + 10,
      y: e.pageY - 20,
    });
  }

  function handleMouseLeave() {
    setHoverCell(null);
  }

  // Click in an employee column
  function handleColumnClick(e, empId) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let clickedTime = START_HOUR + offsetY / PIXELS_PER_HOUR;
    clickedTime = Math.round(clickedTime * 4) / 4;

    setClickedCell({
      employeeId: empId,
      time: clickedTime,
      x: e.pageX + 10,
      y: e.pageY - 20,
    });
  }

  function closePopup() {
    setClickedCell(null);
  }

  const openAddAppointment = () => {
    setIsAddAppointmentOpen(true);
    setClickedCell(null); // Close the small popup
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-50 relative">
        {/* Top Bar */}
        <header className="p-4 border-b bg-white flex justify-between items-center">
          <div className="font-bold text-xl">Define Salon</div>
        </header>

        {/* Stats Cards */}
        <div className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white border rounded shadow-sm px-4 py-2 min-w-[150px]"
            >
              <div className="text-gray-500 text-sm">{stat.label}</div>
              <div className="text-xl font-bold">
                {stat.label === "Today's Revenue" ? `$${stat.value}` : stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Subheader with date navigation */}
        <div className="p-4 border-b bg-white flex items-center space-x-2">
          {/* "Today" button */}
          <button
            onClick={goToday}
            className="px-4 py-1 border rounded-full hover:bg-gray-100 text-sm"
          >
            Today
          </button>

          {/* Left arrow */}
          <button
            onClick={goPrev}
            className="px-3 py-1 border rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeftIcon />
          </button>

          {/* Date label */}
          <div className="px-6 py-1 border rounded-full text-sm flex items-center justify-center">
            {formatCurrentDate(currentDate)}
          </div>

          {/* Right arrow */}
          <button
            onClick={goNext}
            className="px-3 py-1 border rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <ArrowRightIcon />
          </button>
        </div>

        {/* Employee header row (displays each employee's avatar/name) */}
        <div className="flex border-b bg-white">
          {/* Blank space for the hour column */}
          <div className="w-16 border-r" />
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex-1 border-r flex items-center justify-center p-2"
            >
              <div className="flex flex-col items-center space-y-1">
                {/* Employee avatar circle */}
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
                  {emp.avatar}
                </div>
                {/* Employee name */}
                <div className="text-xs font-medium text-gray-700">{emp.name}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Scheduler */}
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Left Column (Hours) */}
            <div className="w-16 border-r">
              {hourLabels.map((hr) => (
                <div
                  key={hr}
                  className="h-[60px] flex items-center justify-end pr-1 text-[10px] text-gray-700 font-bold border-b"
                >
                  {formatTime(hr)}
                </div>
              ))}
            </div>

            {/* Employee Columns */}
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex-1 border-r relative"
                style={{
                  minWidth: "150px",
                  height: TOTAL_HOURS * PIXELS_PER_HOUR,
                }}
                onMouseMove={(e) => handleMouseMove(e, emp.id)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleColumnClick(e, emp.id)}
              >
                {/* Background lines for each 15-min slot */}
                {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-b"
                    style={{ top: idx * 15 }}
                  />
                ))}

                {/* "Now" Line */}
                {nowPosition !== null && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-red-500"
                    style={{ top: nowPosition }}
                  />
                )}

                {/* Render events for this employee */}
                {events
                  .filter((ev) => ev.employeeId === emp.id)
                  .map((evt) => (
                    <CalendarEvent
                      key={evt.id}
                      event={evt}
                      onEventUpdate={handleEventUpdate}
                    />
                  ))}

                {/* Gray area after timeline */}
                <div
                  className="absolute left-0 right-0 bg-gray-200 bg-opacity-50"
                  style={{
                    top: TOTAL_HOURS * PIXELS_PER_HOUR,
                    bottom: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Hover Tooltip (time) */}
        {hoverCell && (
          <div
            className="fixed z-50 px-2 py-1 text-sm bg-gray-200 text-black rounded shadow"
            style={{
              left: hoverCell.x,
              top: hoverCell.y,
              pointerEvents: "none",
            }}
          >
            {formatTime(hoverCell.time)}
          </div>
        )}

        {/* Clicked Popup (Add appointment) */}
        {clickedCell && (
          <div
            className="fixed z-50 w-48 rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{
              left: clickedCell.x,
              top: clickedCell.y,
            }}
          >
            {/* Black top bar with time */}
            <div className="bg-black px-4 py-2 text-sm font-medium text-white">
              {formatTime(clickedCell.time)}
            </div>
            {/* "Add appointment" row */}
            <div
              className="bg-white px-4 py-3 flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={openAddAppointment}
            >
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700">Add Appointment</span>
            </div>
          </div>
        )}

        {/* Slide-in Full-Screen Add Appointment Popup */}
        <div
          className={`fixed top-0 right-0 w-full h-full bg-white z-50 transform transition-transform duration-300 ease-in-out ${
            isAddAppointmentOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-6">
            <button
              onClick={closeAddAppointment}
              className="text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
            <h2 className="text-2xl font-bold mt-4">Add Appointment</h2>
            {/* Add your form or content for adding appointments here */}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
