//let us first do the imports
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

//let us make the server connection w database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

//initialize the database tables
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        //folders table
        db.run(`CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            isOpen BOOLEAN DEFAULT true,
            \`order\` INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('Error creating folders table:', err);
                reject(err);
                return;
            }
            console.log('Folders table ready');
        });

        //items table
        db.run(`CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            icon TEXT DEFAULT '📄',
            folderId TEXT,
            \`order\` INTEGER DEFAULT 0,
            FOREIGN KEY (folderId) REFERENCES folders(id)
        )`, (err) => {
            if (err) {
                console.error('Error creating items table:', err);
                reject(err);
                return;
            }
            console.log('Items table ready');
            resolve();
        });
    });
};

//fn to get all data (folders and items)
const getAllData = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                'folder' as type, id, name, isOpen, NULL as title, NULL as icon, NULL as folderId, \`order\`
            FROM folders
            UNION ALL
            SELECT 
                'item' as type, id, NULL as name, NULL as isOpen, title, icon, folderId, \`order\`
            FROM items
            ORDER BY \`order\`
        `;
        
        // dmrq - what is this syntax? Is this the arguments for db.all ()? 
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

//create new folder
const createFolder = (id, name, order) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO folders (id, name, isOpen, `order`) VALUES (?, ?, ?, ?)',
            [id, name, true, order],
            function(err) {
                if (err) reject(err);
                else resolve({ id, name, isOpen: true, order });
            }
        );
    });
};

//create new item
//dmrq - understand this => {} syntax better
//dmrq - are the parenthesised values arguments?
const createItem = (id, title, icon, folderId, order) => {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO items (id, title, icon, folderId, `order`) VALUES (?, ?, ?, ?, ?)',
            [id, title, icon, folderId, order],
            function(err) {
                if (err) reject(err);
                else resolve({ id, title, icon, folderId, order });
                //dmrq - why are these arguments in parenthesis of resolve? Are they return values? But why do we need to return any thing, this was just a query run right?
            }
        );
    });
};
//dmrq - what does thsi createitem store? Why is it const createitem? Is this some kind of variable that is storing somethign that will be used later?

//update item position/folder
const updateItem = (id, updates) => {
    return new Promise((resolve, reject) => {
        const { title, icon, folderId, order } = updates;
        db.run(
            'UPDATE items SET title = ?, icon = ?, folderId = ?, `order` = ? WHERE id = ?',
            [title, icon, folderId, order, id],
            function(err) {
                if (err) reject(err);
                else resolve({ id, ...updates });
                //dmrq - again, why are these variables in resolve? What do they help us do?
            }
        );
    });
};

//update folder
const updateFolder = (id, updates) => {
    return new Promise((resolve, reject) => {
        const { name, isOpen, order } = updates;
        db.run(
            'UPDATE folders SET name = ?, isOpen = ?, `order` = ? WHERE id = ?',
            [name, isOpen, order, id],
            function(err) {
                if (err) reject(err);
                else resolve({ id, ...updates });
            }
        );
    });
};

//delete item
const deleteItem = (id) => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM items WHERE id = ?',
            [id],
            function(err) {
                if (err) reject(err);
                else resolve({ id, deleted: true });
            }
        );
    });
};

//delete folder (and move its items to loose items)
const deleteFolder = (id) => {
    return new Promise((resolve, reject) => {
        //in my impleentation, when we delete a folder, we are not necessarily deleting all the items inside. we are just kinda ungrouping the items
        //first, move all items from this folder to loose items (folderId = NULL)
        
        db.run(
            'UPDATE items SET folderId = NULL WHERE folderId = ?',
            [id],
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Then delete the folder
                db.run(
                    'DELETE FROM folders WHERE id = ?',
                    [id],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id, deleted: true });
                    }
                );
            }
        );
    });
};

module.exports = {
    db,
    initializeDatabase,
    getAllData,
    createFolder,
    createItem,
    updateItem,
    updateFolder,
    deleteItem,
    deleteFolder
};
