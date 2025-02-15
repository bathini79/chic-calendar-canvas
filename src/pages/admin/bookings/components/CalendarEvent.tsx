
import React from "react";
import { useDrag } from "react-dnd";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

interface CalendarEventProps {
  event: {
    id: number;
    employeeId: number;
    title: string;
    startHour: number;
    duration: number;
  };
  onEventUpdate: (eventId: number, changes: { startHour?: number; duration?: number }) => void;
}

const PIXELS_PER_HOUR = 60;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
const START_HOUR = 8;
const END_HOUR = 20;
const ItemTypes = { EVENT: "event" };

export function CalendarEvent({ event, onEventUpdate }: CalendarEventProps) {
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

  const onResizeStop = (e: any, data: { size: { height: number } }) => {
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
