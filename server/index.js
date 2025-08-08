//main imp file of backend - do all http and api stuff here
//similar to the airline resv project (dbms2)

//let us first do the ipmorts
const express = require('express'); //this will handle http get post put delete requests    
const http = require('http'); //this will create the http server
const socketIo = require('socket.io'); //this will handle the real-time communication between client and server 

//(is this like socket programming in networks that we did in python??? check network assignment codes later)

const cors = require('cors'); //allows backend to accept request from other origins (frontend only basically)
const { v4: uuidv4 } = require('uuid'); //we'll need this for generating IDs of folders and items

//import our database functions from db.js
//could have also done datavase logic and server logic in one like airline resv done in flask
//but chose to do it differently here - just for fun
//dmrq - the thing weitten above - is that possible? Can we combien the databse logic and server logic? How was it actually done in flask?

const {
    initializeDatabase,
    getAllData,
    createFolder,
    createItem,
    updateItem,
    updateFolder,
    deleteItem,
    deleteFolder
} = require('./db');

//we now create our express app and wrap it in http server
const app = express();
const server = http.createServer(app);

//socket io needs http server, but we want express features
//thus - wrap react app over http server!! Best of both worlds

//configure socket.io to accept connections from frnotend (react app)
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // React app URL
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

//middleware
//dmrq - did not really get the middleware thing. Understand it properly again
//Explanation given: Express Middleware:
// Execution Order: Middleware runs before route handlers
// cors(): Adds CORS headers to all HTTP responses
// express.json(): Parses JSON request bodies into JavaScript objects
// Without this: req.body would be undefined for JSON requests
// Automatic: Handles content-type parsing and error handlin
// whats up with this json parsing?

app.use(cors({
    origin: "http://localhost:3000" //allow frontend react app to make requests to backend which is otherwise blocked by CORS
}));
app.use(express.json()); //parse JSON request bodies

//API ROUTES//
// GET /api/data - get all folders and items
//here we use the resolve / reject / catch err format of typescript
//dmrq - understand () => {} syntax of this
// what does "GET requests to /api/data" mean? What exactly is api/data? 
app.get('/api/data', async (req, res) => {
    try {
        const data = await getAllData();
        console.log('Sending all data to client');
        res.json(data);
        //does this res.json actually have the all data in json format?
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
        //what does the json have in this case? The error message printed above?
        
    }
});

// POST /api/folders - Create new folder
app.post('/api/folders', async (req, res) => {
    try {
        const { name, order } = req.body;
        //dmrq - why are we taking order from the request? Shoudl this not be self determined?
        //what if order is not mentioned? Will our website work in that case?6
        const id = uuidv4(); //generate unique ID
        
        const folder = await createFolder(id, name, order || 0);
        console.log('Created folder:', folder);
        
        //broadcast to all connected clients so that they can update their UI to latest thing
        io.emit('folderCreated', folder);
        
        res.status(201).json(folder);
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// POST /api/items - Create new item
app.post('/api/items', async (req, res) => {
    try {
        const { title, icon, folderId, order } = req.body;
        const id = uuidv4();
        
        const item = await createItem(id, title, icon || '📄', folderId, order || 0);
        console.log('Created item:', item);
        
        //broadcast to all connected clients
        io.emit('itemCreated', item);
        
        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

// PUT /api/items/:id - Update item (for drag & drop)
app.put('/api/items/:id', async (req, res) => {
    try {
        //dmrq - understand wha req.paras and req.body actually is
        const { id } = req.params;
        const updates = req.body;
        
        const updatedItem = await updateItem(id, updates);
        console.log('Updated item:', updatedItem);
        
        //broadcast to all connected clients
        io.emit('itemUpdated', updatedItem);
        
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// PUT /api/folders/:id - Update folder (for open/close state, drag & drop)
app.put('/api/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const updatedFolder = await updateFolder(id, updates);
        console.log(' Updated folder:', updatedFolder);
        
        //broadcast to all connected clients
        io.emit('folderUpdated', updatedFolder);
        
        res.json(updatedFolder);
    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

// DELETE /api/items/:id - Delete item
app.delete('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await deleteItem(id);
        console.log('Deleted item:', result);
        
        //broadcast to all connected clients
        io.emit('itemDeleted', { id });
        
        res.json(result);
        //dmrq - what is result actually here?
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// DELETE /api/folders/:id - Delete folder (moves items to loose items)
app.delete('/api/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await deleteFolder(id);
        console.log('Deleted folder:', result);
        
        //broadcast to all connected clients
        io.emit('folderDeleted', { id });
        
        res.json(result);
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

//socket.io real tim events//

let connectedClients = 0;
//dmrq - try to understand this syntax structure
//the outside brackets are for while the client is connected
// and then everythign elsr is inside socket.on(, async () => {}) something like that
io.on('connection', (socket) => {
    connectedClients++;
    console.log('🔌 Client connected:', socket.id, `(${connectedClients} total clients)`);
    
    //send current data to newly connected client
    //this kinda shows the new client everythign that we want to show them 
    //i.e. -  the most recent data
    socket.on('requestInitialData', async () => {
        try {
            const data = await getAllData();
            socket.emit('initialData', data);
            //sockt.emit sends data only to the particular client.
            //eralier we did io.emit - that would send the data to eevryone, kinda like broadcast of networks
            console.log('📊 Sent initial data to client:', socket.id);
        } catch (error) {
            console.error('Error sending initial data:', error);
            socket.emit('error', { message: 'Failed to load initial data' });
        }
    });
    
    //handle bulk updates (useful for drag and drop reordering)
    socket.on('bulkUpdate', async (updates) => {
        try {
            const { items = [], folders = [] } = updates;
            
            //update all items
            for (const item of items) {
                await updateItem(item.id, item);
            }
            
            //update all folders  
            for (const folder of folders) {
                await updateFolder(folder.id, folder);
            }
            
            console.log('🔄 Bulk update completed');
            
            //broadcast bulk update to all clients except the sender
            //dmrq - does this send the updates to the receivers? But isnt the ypdate already done by the updareItem and updateFolder functions?
            socket.broadcast.emit('bulkUpdateReceived', updates);
            
        } catch (error) {
            console.error('Error in bulk update:', error);
            socket.emit('error', { message: 'Bulk update failed' });
        }
    });
    
    //handle disconnection
    socket.on('disconnect', () => {
        connectedClients--;
        console.log('🔌 Client disconnected:', socket.id, `(${connectedClients} total clients)`);
    });
    
    // Broadcast client count to all clients
    io.emit('clientCount', connectedClients);
});

//dmrq - is this it inside socket functinoalituy? What if I add a new folder, will that reflect to everyone?
//how is that handled in our codebase? That wont fall under neither request intiail data nor bulk updates right

//SERVER INITIALIZATION

//dmrq - what is this? 5000 or somethign else?
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        //initialize database tables
        await initializeDatabase();
        console.log('🗄️ Database initialized successfully');
        
        //start the server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 Socket.io ready for real-time communication`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

//start the server
startServer();