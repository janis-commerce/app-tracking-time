class Database {
    constructor(filename) {
      this.filename = filename;
    }
  
    async save() {
      // Simula el guardado del evento sin hacer nada
      return Promise.resolve();
    }
  
    async search() {
      // Simula una búsqueda, devolviendo una lista de eventos vacía o lo que necesites
      return [];
    }
  
    async delete() {
      // Simula la eliminación de eventos
      return Promise.resolve();
    }
  
    async deleteAll() {
      // Simula la eliminación de todos los eventos
      return Promise.resolve();
    }
  }
  
  export default Database;