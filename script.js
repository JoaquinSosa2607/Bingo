let numerosDisponibles = [];

window.onload = function () {
    const bolillero = document.getElementById("bolillero");
    for (let i = 1; i <= 90; i++) {
        numerosDisponibles.push(i);
        let card = document.createElement("div");
        card.classList.add("card", "text-center");
        card.innerText = i;
        bolillero.appendChild(card);
    }
};

function extraerNumero() {
    if (numerosDisponibles.length === 0) {
        alert("¡Todos los números han sido extraídos!");
        return;
    }
    let indiceAleatorio = Math.floor(Math.random() * numerosDisponibles.length);
    let numeroExtraido = numerosDisponibles.splice(indiceAleatorio, 1)[0];

    document.getElementById("numeroExtraido").innerText =
        "Número Extraído: " + numeroExtraido;
    $("#numeroExtraidoModal").modal("show");

    cambiarFondoVerde(numeroExtraido);
}

function cambiarFondoVerde(numeroExtraido) {
    let card = document.querySelector(
        `#bolillero .card:nth-child(${numeroExtraido})`
    );
    card.classList.add("extraccion");
}

function mostrarFelicitacion() {
    $("#felicitacionModal").modal("show");
}

function reiniciarJuego() {
    location.reload();
}
