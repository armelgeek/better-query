import React, { useEffect, useState } from "react";
import { createClient } from "../../../packages/better-query/src/client";
import type { Query } from "../server/index";

const client = createClient<Query["api"]>({
  url: "http://localhost:3000/api",
  realtimeUrl: "http://localhost:3001/realtime"
});

export default function App() {
  const [todos, setTodos] = useState<any[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const fetchTodos = async () => {
    const { data } = await client("todo").list();
    if (data?.items) setTodos(data.items);
  };

  const addTodo = async () => {
    if (!newTodo) return;
    await client("todo").create({
      title: newTodo,
      completed: false
    });
    setNewTodo("");
  };

  const toggleTodo = async (todo: any) => {
    await client("todo").update({
      params: { id: todo.id },
      body: { completed: !todo.completed }
    });
  };

  const deleteTodo = async (id: string) => {
    await client("todo").delete({
      params: { id }
    });
  };

  useEffect(() => {
    fetchTodos();
    
    // Connect to realtime server
    client.connect();
    
    // Watch for todo changes
    const unwatch = client("todo").watch(() => {
      fetchTodos();
    });
    
    return () => {
      unwatch();
    };
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Better Query To-Do</h1>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <input 
          value={newTodo} 
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="What needs to be done?"
          style={{ padding: "0.5rem", flex: 1 }}
        />
        <button onClick={addTodo} style={{ padding: "0.5rem 1rem" }}>Add</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map(todo => (
          <li key={todo.id} style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "1rem", 
            padding: "0.5rem", 
            borderBottom: "1px solid #eee" 
          }}>
            <input 
              type="checkbox" 
              checked={todo.completed} 
              onChange={() => toggleTodo(todo)} 
            />
            <span style={{ 
              flex: 1, 
              textDecoration: todo.completed ? "line-through" : "none" 
            }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)} style={{ color: "red" }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
