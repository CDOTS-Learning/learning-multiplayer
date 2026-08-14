import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Game from "@/pages/game";
import NotFound from "@/pages/not-found";

import Facilitator from "./pages/facilitator";

const Routes = () => (
  <Switch>
    <Route path="/game/:roomCode" component={Game} />
    <Route path="/facilitator/:roomCode" component={Facilitator} />
    {/* other routes */}
  </Switch>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/game/:roomCode" component={Game} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
