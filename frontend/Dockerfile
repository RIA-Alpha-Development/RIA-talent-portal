
# Use Node.js for building and serving
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the React app (assuming a standard build script)
# For this environment, we serve the source directly via the server
# In a real production build, you would run: RUN npm run build

EXPOSE 8080

# Start the server
CMD [ "node", "server.js" ]
