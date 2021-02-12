module.exports = {
    scrap_count: 0, // scrap count for statistics
    failed_scrap_count: 0, // failed scraps

    uptime_str: function() {
        let secs = process.uptime(); // secs
    
        const days = Math.floor(secs / (60 * 60 * 24));
        secs -= days * (60 * 60 * 24);
    
        const hours = Math.floor(secs / (60 * 60));
        secs -= hours * (60 * 60);
    
        const mins = Math.floor(secs / 60);
        secs -= mins * (60);
    
        return `${days} days, ${hours} hours, ${mins} mins, ${secs} seconds`;
    }
}