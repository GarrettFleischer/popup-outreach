"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Test realtime connection
    const channel = supabase
      .channel("test-realtime")
      .on("presence", { event: "sync" }, () => {
        setIsConnected(true);
      })
      .on("presence", { event: "join" }, () => {
        setIsConnected(true);
      })
      .on("presence", { event: "leave" }, () => {
        setIsConnected(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs">
      <div className="flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-gray-600">
          {isConnected ? "Realtime Connected" : "Realtime Disconnected"}
        </span>
      </div>
      {lastUpdate && (
        <div className="text-gray-500 mt-1">Last update: {lastUpdate}</div>
      )}
    </div>
  );
}
