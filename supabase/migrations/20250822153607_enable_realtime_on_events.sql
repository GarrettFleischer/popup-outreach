-- Enable realtime on the events table
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Enable realtime on the attendees table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE attendees;

-- Enable realtime on the saved table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE saved;
